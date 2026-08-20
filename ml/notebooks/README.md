# Notebooks

Exploration only. Anything that another person needs to re-run belongs in
`ml/src/` as a tested module.

## Naming

`NN-short-description.ipynb`, numbered in the order they should be read:

```
01-eda.ipynb
02-feature-analysis.ipynb
03-model-comparison.ipynb
```

## Strip outputs before committing

CI rejects notebooks that carry saved outputs - they bloat the repository and
can leak patient rows into git history.

```bash
pip install nbstripout
nbstripout --install          # run once per clone; strips outputs on commit
nbstripout ml/notebooks/*.ipynb   # or clean them manually
```
