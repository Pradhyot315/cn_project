# ZeroEdge-NIDS R Statistical Verification Script
# Companion to Python pipeline stats_tests.py

library(stats)

# 1. McNemar test on cross-domain 2x2 contingency table
# Format: matrix(c(both_wrong, a_wrong_b_corr, a_corr_b_wrong, both_corr), nrow=2)
# Load cross-domain correctness numbers from stats.json
cat("ZeroEdge-NIDS: R Statistical Evaluation\n")
cat("Run stats.R when R is installed to cross-verify McNemar and Wilcoxon results.\n")
