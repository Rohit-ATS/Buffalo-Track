-- Matches the plan's literal effect-class spelling: "loss-of-function" /
-- "gain-of-function" / "dominant-negative" (hyphenated), not the
-- space-separated values 20261003000003_atlas.sql originally used.
-- "repeat expansion" and "unknown" already matched, so they're untouched.
--
-- ALTER TYPE ... RENAME VALUE only renames the label; every existing row's
-- effect_class is stored by the enum's internal OID, not by comparing
-- strings, so this updates all of them with no data migration needed.
alter type effect_class rename value 'loss of function' to 'loss-of-function';
alter type effect_class rename value 'gain of function' to 'gain-of-function';
alter type effect_class rename value 'dominant negative' to 'dominant-negative';
