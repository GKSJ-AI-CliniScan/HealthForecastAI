# Scripts

| Path | Purpose |
|------|---------|
| `ci/` | The check scripts run by [CI](../.github/workflows/ci.yml) |

Every script in `ci/` uses the Python standard library only, so it runs anywhere
without installing anything. Run them from the repository root:

```bash
python scripts/ci/check_structure.py
python scripts/ci/check_syntax.py
python scripts/ci/check_files.py
python scripts/ci/check_secrets.py
python scripts/ci/check_notebooks.py
python scripts/ci/check_docs.py
python scripts/ci/check_milestones.py
python scripts/ci/check_branch.py "$(git branch --show-current)"
```

Each exits non-zero on failure and prints what to do about it.

## Changing a check

These files are shared by all 26 interns. Making a check weaker on your branch
does not make your code correct - it hides a problem your reviewer will find
anyway. If a check is wrong, open a
[CI issue](https://github.com/GKSJ-AI-CliniScan/HealthForecastAI/issues/new?template=ci-failure.yml) instead.
