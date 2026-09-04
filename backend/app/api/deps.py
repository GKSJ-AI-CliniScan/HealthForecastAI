"""Shared FastAPI dependencies: authentication and permission guards.

Two layers of caller identity are available.

``get_current_user`` reconstructs the caller from the token alone. It is cheap,
needs no database, and is what the service level routes use.

``get_verified_user`` additionally reloads the account and rejects it when it has
been deleted or disabled. Endpoints that return patient data use this one,
because a token stays valid until it expires: without the reload, revoking
someone's access would not take effect until then.
"""

from collections.abc import Callable, Generator
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.rbac import Permission, Role, has_permission, permissions_for
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User
from app.services import audit_service

bearer_scheme = HTTPBearer(auto_error=False)

CREDENTIALS_HEADER = {"WWW-Authenticate": "Bearer"}


# Re-exported so that ``app.api.deps.get_db`` and ``app.db.session.get_db`` are
# the same object. Tests override the dependency by identity, so two separate
# definitions would mean overriding one leaves the other pointing at the real
# database.
__all__ = ["get_db"]


@dataclass(frozen=True)
class CurrentUser:
    """The authenticated caller, reconstructed from JWT claims."""

    subject: str
    role: Role

    @property
    def permissions(self) -> list[str]:
        """Return the permission strings granted to this caller's role."""
        return permissions_for(self.role)


@dataclass(frozen=True)
class VerifiedUser(CurrentUser):
    """A caller whose account has been confirmed to exist and be active."""

    id: int = 0
    full_name: str = ""


def _unauthorised(detail: str) -> HTTPException:
    """Build a 401 with the bearer challenge header attached."""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail=detail, headers=CREDENTIALS_HEADER
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    """Resolve the caller from the Authorization header, or raise 401.

    An unrecognised role is rejected rather than defaulted. Falling back to a
    clinical role would turn a corrupted record into a privilege escalation.
    """
    if credentials is None:
        raise _unauthorised("Not authenticated")

    claims = decode_token(credentials.credentials)
    if claims is None or not claims.get("sub"):
        raise _unauthorised("Invalid or expired token")

    try:
        role = Role(claims.get("role", ""))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unknown role") from exc

    return CurrentUser(subject=str(claims["sub"]), role=role)


def verify_account(caller: CurrentUser, db: Session) -> VerifiedUser:
    """Reload the caller's account and reject deleted or disabled users.

    Also rejects a token whose role no longer matches the stored one, so a
    demotion takes effect immediately rather than at token expiry.
    """
    user = db.query(User).filter(User.email == caller.subject).one_or_none()
    if user is None:
        raise _unauthorised("User no longer exists")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
    if user.role != str(caller.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Token role no longer matches account"
        )

    return VerifiedUser(subject=user.email, role=caller.role, id=user.id, full_name=user.full_name)


# WHAT      : derive (resource_type, resource_id) for the audit entry from
#             the permission being checked and the request's path
#             parameters, instead of asking every endpoint to supply them.
# WHY       : N1 requires each audit row to name the target resource type
#             and id. Every permission string in app.core.rbac already
#             follows a "<resource>:<verb>" shape (e.g. "patient:read_all"),
#             and FastAPI resolves path parameters before dependencies run,
#             so both pieces are available here without touching risk.py or
#             patients.py at all.
# FOR WHOM  : require_verified_permission and require_any_verified_permission,
#             called once per guarded request.
# BENEFIT   : centralising this in app.api.deps means every current and
#             future route guarded the same way is audited for free - no
#             endpoint can forget to log itself.
# COST      : resource_id is only ever populated from a URL path parameter.
#             POST /risk/predict names its patient in the JSON body, not the
#             path, so its audit rows carry resource_id=None. Reading the
#             body here would mean parsing it twice (once for the guard,
#             once for the endpoint) and coupling this generic guard to one
#             specific request schema.
# ALTERNATIVES : (1) have each endpoint call audit_service.record() itself
#             with the exact resource it resolved; (2) parse the request
#             body inside the guard for routes that need it.
# CHOSEN BECAUSE : (1) is what N1 explicitly warns against duplicating by
#             hand across every risk and patient endpoint, and C10 favours
#             extending the one choke point every one of them already
#             passes through; (2) buys one more populated field on one route
#             at the cost of coupling a shared guard to a specific request
#             schema. The gap is recorded honestly in the milestone report
#             rather than hidden.
def _resource_from_permission(permission: Permission, request: Request) -> tuple[str, str | None]:
    """Return (resource_type, resource_id) to attach to this request's audit entry."""
    resource_type = str(permission).split(":", 1)[0]
    resource_id = next((str(value) for value in request.path_params.values()), None)
    return resource_type, resource_id


# WHAT      : look up the caller's account id purely to attach it to a
#             denied-request audit entry, then write that entry.
# WHY       : a permission check that fails happens before verify_account()
#             runs, so at that point all we have is the token's claimed
#             email and role, not a database-confirmed numeric id. Knowing
#             *who* was denied matters at least as much as knowing who
#             succeeded on a healthcare platform, so it is worth one extra
#             query rather than leaving actor_id null on every denial.
# FOR WHOM  : both guard factories below, on every branch where access is
#             refused (permission missing, account disabled, account
#             deleted, role no longer matches).
# BENEFIT   : a denied audit row still names the account that was denied,
#             not just the role it claimed.
# COST      : one extra SELECT on the user table for every denied request;
#             when verify_account() itself is what raised, this repeats a
#             lookup verify_account already did (it does not expose the row
#             it loaded), so the denial path pays for the same query twice.
# ALTERNATIVES : (1) skip the lookup and record actor_id=None on every
#             denial; (2) change verify_account()'s signature to return or
#             raise with the loaded row attached, so both callers can share
#             one query.
# CHOSEN BECAUSE : (1) is cheaper but produces a compliance log that cannot
#             say who a denied request came from - the exact case an
#             auditor cares about most; (2) would touch a function other
#             code already depends on for its current behaviour, which is
#             more risk than a second SELECT on an already-exceptional path
#             (C10: extend, do not rewrite what already works). Denials are
#             the minority of requests, so the duplicate query is cheap in
#             aggregate.
def _audit_denied(
    db: Session,
    caller: CurrentUser,
    action: str,
    resource_type: str,
    resource_id: str | None,
) -> None:
    """Best-effort audit write for a request that was refused."""
    actor = db.query(User).filter(User.email == caller.subject).one_or_none()
    audit_service.record(
        db,
        actor_id=actor.id if actor is not None else None,
        actor_role=str(caller.role),
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        outcome="denied",
    )


# WHAT      : classify the exception a guarded request ended with into the
#             audit table's terminal outcome - "denied" or "error" - rather
#             than the guard-level record() call staying "success" just
#             because the permission and account checks both passed.
# WHY       : the permission check happens before row-level scoping (a
#             doctor's own patient vs. someone else's) and before the
#             endpoint's own business logic run at all. A doctor requesting
#             a patient outside their assignment clears the permission and
#             account checks, then patient_service/risk_service reject them
#             with a 404 - by design, the same code as "does not exist" (see
#             risk_service.assert_patient_in_scope's docstring). Both 404
#             reasons are, from an audit standpoint, a denial: the caller
#             did not get the record. A 503 or 409 is a different kind of
#             failure - the caller was allowed to try, the system could not
#             comply - and calling that "denied" would blur the one signal
#             this table exists to give a compliance reviewer: was this
#             person allowed to see this thing or not.
# FOR WHOM  : the except-branch of both guards below, once per guarded
#             request that raises after being authorized.
# BENEFIT   : "denied" in this table means exactly one thing - the caller
#             did not get access to what they asked for, whether that was
#             caught at the permission layer or the row-scoping layer - and
#             "error" means something else broke after access was granted.
# COST      : a fixed status-code list to maintain; a future endpoint that
#             introduces a new denial-shaped status code (e.g. 410 Gone for
#             a deleted-but-remembered record) will silently classify as
#             "error" unless this set is updated too.
# ALTERNATIVES : (1) treat every non-2xx as "denied", collapsing a 503 model
#             outage into the same bucket as a rejected access attempt; (2)
#             treat every non-2xx as "error", which is what A6 exists to
#             fix - a scoping 404 is unambiguously a denial, not a generic
#             error.
# CHOSEN BECAUSE : (1) would make "denied" noisy with pure outages, which is
#             exactly the false signal a compliance query cannot afford; (2)
#             is the defect A6 reports. A short, explicit status-code set
#             tied to the actual codes this codebase's guarded endpoints
#             raise for authorization/scope reasons (401, 403, 404) is more
#             honest than guessing from the exception's class alone.
_DENIAL_STATUS_CODES = frozenset(
    {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND}
)


def _outcome_for_exception(exc: BaseException) -> str:
    """Classify a request-ending exception as a compliance "denied" or a plain "error"."""
    if isinstance(exc, HTTPException) and exc.status_code in _DENIAL_STATUS_CODES:
        return "denied"
    return "error"


def require_permission(permission: Permission) -> Callable[..., CurrentUser]:
    """Build a dependency that rejects callers lacking the given permission."""

    def guard(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not has_permission(user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' lacks permission '{permission}'",
            )
        return user

    return guard


def require_role(*roles: Role) -> Callable[..., CurrentUser]:
    """Build a dependency that only allows the listed roles."""

    allowed = frozenset(roles)

    def guard(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' is not permitted to access this resource",
            )
        return user

    return guard


def require_verified_permission(
    permission: Permission,
) -> Callable[..., Generator[VerifiedUser, None, None]]:
    """Guard on a permission, then confirm the account is still active.

    The permission is checked from the token claims first and the account is
    reloaded only if it passes. Ordering it this way means a caller who was never
    allowed here is rejected without a database round trip, and an endpoint they
    cannot reach cannot be used to probe whether the database is up.
    """

    # WHAT      : audit every way this guard can end - permission missing,
    #             account invalid, authorized-then-denied-by-row-scope, or
    #             actually completed - not just "the permission check passed".
    # WHY       : this factory backs every risk and patient-access endpoint, so
    #             it is the one place N1's "an entry on both success and denial"
    #             requirement can be satisfied once instead of once per route.
    #             It runs before the endpoint body, so a permission+account
    #             pass here does not yet mean the request will succeed: a
    #             doctor requesting a patient outside their assignment clears
    #             both checks and is only stopped afterwards, by row-level
    #             scoping - the case A6 reported this guard was misreporting
    #             as outcome="success".
    # FOR WHOM  : every endpoint built on require_verified_permission -
    #             currently all of risk.py and most of patients.py.
    # BENEFIT   : a new endpoint that reuses this guard is audited automatically,
    #             and its final outcome reflects what actually happened to the
    #             request, not just whether it was let past the door.
    # COST      : the guard now does up to two database round trips on a
    #             pre-endpoint denial (the actor lookup in _audit_denied, then
    #             verify_account's own lookup), and two audit writes on a
    #             request that clears both checks (one "authorized" row, then
    #             one UPDATE once the outcome is known) instead of one.
    # ALTERNATIVES : (1) log only the permission decision, since that used to
    #             be the whole guard's job; (2) log from inside each endpoint
    #             body once its own business logic concludes, instead of a
    #             shared `yield`-based correction here.
    # CHOSEN BECAUSE : (1) is the defect A6/A7 report - the permission
    #             decision is not the same thing as what happened to the
    #             request; (2) would mean patients.py and risk.py both grow
    #             logging calls this guard already has every fact needed to
    #             make (C10: extend the one choke point, do not duplicate the
    #             decision across every route that uses it).
    def guard(
        request: Request,
        caller: CurrentUser = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> Generator[VerifiedUser, None, None]:
        resource_type, resource_id = _resource_from_permission(permission, request)
        action = str(permission)

        if not has_permission(caller.role, permission):
            _audit_denied(db, caller, action, resource_type, resource_id)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{caller.role}' lacks permission '{permission}'",
            )

        try:
            verified = verify_account(caller, db)
        except HTTPException:
            _audit_denied(db, caller, action, resource_type, resource_id)
            raise

        entry = audit_service.record(
            db,
            actor_id=verified.id,
            actor_role=str(verified.role),
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            outcome="authorized",
        )
        # Exposed so an endpoint whose specific resource only becomes known
        # after the request body is parsed (POST /risk/predict - see A8) can
        # attach it via audit_service.attach_resource() without a second row.
        request.state.audit_entry = entry

        try:
            yield verified
        except Exception as exc:
            audit_service.finalize(db, entry, _outcome_for_exception(exc))
            raise
        else:
            audit_service.finalize(db, entry, "success")

    return guard


def require_any_verified_permission(
    *permissions: Permission,
) -> Callable[..., Generator[VerifiedUser, None, None]]:
    """Allow a verified caller holding at least one of the given permissions.

    Several roles reach the same endpoint through different rights: a doctor
    reads assigned patients, an administrator reads all of them. As above, the
    permission is checked before the account is reloaded.
    """

    # WHAT      : audit every outcome here too, same as require_verified_permission
    #             above - see that function's comment block for the full
    #             WHY/COST/ALTERNATIVES; this repeats only what differs.
    # WHY       : this factory guards the rest of patients.py (list, stats,
    #             detail) through an "any of several permissions" check, so it
    #             needs its own audit call rather than inheriting the other
    #             factory's.
    # FOR WHOM  : every endpoint using require_any_verified_permission.
    # BENEFIT   : same as above - centralised, automatic for future routes,
    #             and the recorded outcome reflects the request's real ending
    #             (e.g. a doctor's out-of-scope GET /patients/{id} is "denied",
    #             not "success").
    # COST      : same as above, plus one nuance - on success the *granted*
    #             permission is logged (e.g. "patient:read_all" for an admin),
    #             not the full list offered to the route, so two roles hitting
    #             the same endpoint produce different, more specific actions.
    # ALTERNATIVES : same two considered above.
    # CHOSEN BECAUSE : same reasoning as above; logging the specific granted
    #             permission rather than the whole tuple was chosen because
    #             "patient:read_all" tells a reviewer more than
    #             "patient:read_assigned, patient:read_all" would for a
    #             request that only ever used one of them.
    def guard(
        request: Request,
        caller: CurrentUser = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> Generator[VerifiedUser, None, None]:
        resource_type, resource_id = (
            _resource_from_permission(permissions[0], request) if permissions else ("unknown", None)
        )
        granted = next((p for p in permissions if has_permission(caller.role, p)), None)

        if granted is None:
            allowed = ", ".join(str(p) for p in permissions)
            _audit_denied(db, caller, allowed, resource_type, resource_id)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{caller.role}' needs one of: {allowed}",
            )

        try:
            verified = verify_account(caller, db)
        except HTTPException:
            _audit_denied(db, caller, str(granted), resource_type, resource_id)
            raise

        entry = audit_service.record(
            db,
            actor_id=verified.id,
            actor_role=str(verified.role),
            action=str(granted),
            resource_type=resource_type,
            resource_id=resource_id,
            outcome="authorized",
        )
        request.state.audit_entry = entry

        try:
            yield verified
        except Exception as exc:
            audit_service.finalize(db, entry, _outcome_for_exception(exc))
            raise
        else:
            audit_service.finalize(db, entry, "success")

    return guard
