# Mentor setup checklist

The pipeline enforces everything it can from inside the repository. A few things
can only be set in GitHub's settings — do these once.

> **This list is not optional.** On 8 September 2026 a pull request from an intern
> branch was merged into `main`, adding a second parallel backend to the shared
> skeleton. The Branch guard workflow failed that pull request, and it was merged
> anyway, because **a failing status check does not block a merge on its own**.
> Steps 1 and 2 below are what actually prevent it.

## 1. Protect `main`

Settings → Rules → Rulesets → New branch ruleset, targeting `main`:

- [ ] **Restrict deletions**
- [ ] **Block force pushes**
- [ ] **Restrict updates** — allow only the mentor team to push. This is the one
      that stops `git push origin main` from an intern's laptop.
- [ ] **Require a pull request before merging** — optional. Nobody should be
      merging at all, and the Branch guard workflow rejects any pull request that
      is opened anyway. If you do turn it on, add the next item.
- [ ] **Require status checks to pass** → add `Pull requests into main are not accepted`.
      Without this the Branch guard is advisory: it goes red and the merge button
      still works.

Enforcement status must be **Active**, not "Evaluate" — evaluate mode reports
violations without blocking them.

Without this, an intern who runs `git push origin main` by accident rewrites the
shared skeleton for all 26 branches.

## 2. Check who can merge

Settings → Collaborators and teams. Interns need **Write** to push their own
branches — and Write also lets them push to `main` and click Merge, which is
exactly why step 1 matters.

If the ruleset in step 1 is set up correctly, Write access is safe. If it is not,
every intern can rewrite `main`.

## 3. Actions permissions

Settings → Actions → General:

- [ ] Allow all actions and reusable workflows (the pipeline uses `actions/*` and
      `docker/*`)
- [ ] Workflow permissions: **Read repository contents** — each workflow requests
      the extra scopes it needs per job
- [ ] Allow GitHub Actions to create and approve pull requests: **off**

If this repository is private, watch the Actions minutes: 26 interns pushing
several times a day will consume them. The pipeline already cancels superseded
runs on the same branch, skips jobs for areas with no code yet, and only rebuilds
Docker images when a Dockerfile or a dependency file changed.

## 4. Confirm the roster

[`.github/interns.yml`](../.github/interns.yml) is the source of truth for branch
names, and [INTERN_GUIDE.md § 13](../INTERN_GUIDE.md#13-branch-roster) repeats it
as a table. If you correct a name, change it in both places — CI rejects any
branch not in the roster file.

`scripts/ci/check_roster.py` runs on every push and catches duplicate ids, names
or branches, a branch whose number disagrees with its entry, and any email address
that creeps in.

## 5. Watch the cohort

Actions → **Cohort report** → Run workflow (it also runs itself every Monday at
04:00 UTC). The run summary lists every intern in the roster: their branch, how
many commits they are ahead of `main`, their last CI result, and how long since
their last push — with call-outs for branches that do not exist yet, are failing,
or have gone quiet for a week.

Because it walks the roster rather than the branch list, an intern who never
created a branch shows up as a gap rather than as silence.

## 6. Reviewing a milestone

Check out the intern's branch read-only:

```bash
git fetch origin
git checkout intern/NN-firstname-lastname
```

Their milestone report is in `docs/06-milestones/`, and the CI run summary for
that branch tells you which areas have code and whether the checks pass.

## 7. If something does get merged into `main`

Revert the merge rather than resetting — the history stays honest and nobody who
already pulled gets a broken clone:

```bash
git fetch origin
git checkout main
git revert -m 1 <merge-sha>
git push origin main
```

Reverting a merge makes git treat that branch as already merged, so a later
attempt to merge it again does nothing. On this project that is the intended
outcome. The intern's work is untouched on their own branch, which is where it is
graded from — tell them so, because the revert looks alarming from their side.
