import copy
import unittest
from pathlib import Path
import yaml
from lint_specs import ROOT, UniqueLoader, run_contract_errors


class ContractLintTests(unittest.TestCase):
    def setUp(self):
        paths = ["domain/mission-lifecycle.yaml", "api/mission-detail.yaml"]
        self.documents = {}
        for path in paths:
            document = yaml.safe_load((ROOT / "spec" / path).read_text())
            self.documents[document["id"]] = document

    def test_current_contract(self):
        self.assertEqual(run_contract_errors(self.documents), [])

    def test_terminal_timestamp_drift_is_rejected(self):
        broken = copy.deepcopy(self.documents)
        fields = broken["domain.mission-lifecycle"]["entities"][1]["fields"]
        next(field for field in fields if field["name"] == "endedAt")["name"] = "completedAt"
        self.assertTrue(any("endedAt" in error for error in run_contract_errors(broken)))

    def test_mission_only_status_is_rejected_in_run_api(self):
        broken = copy.deepcopy(self.documents)
        fields = broken["api.mission-detail"]["responses"][0]["body"]["properties"]["latestRun"]["properties"]
        fields["status"]["enum"].append("stalled")
        self.assertTrue(any("status" in error for error in run_contract_errors(broken)))

    def test_duplicate_yaml_keys_fail_instead_of_overwriting(self):
        with self.assertRaises(ValueError):
            yaml.load("kind: api\nkind: page\n", Loader=UniqueLoader)


if __name__ == "__main__":
    unittest.main()
