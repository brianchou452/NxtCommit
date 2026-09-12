"""Validate existing contracts; report absent implementation tests separately."""
import json
from pathlib import Path
import sys
import yaml
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[2]


def validate(root=ROOT):
    schemas = {}
    for path in sorted((root / "spec/schemas").glob("*.schema.yaml")):
        schema = yaml.safe_load(path.read_text())
        Draft202012Validator.check_schema(schema)
        schemas[path.name.removesuffix(".schema.yaml")] = Draft202012Validator(schema)
    if not schemas:
        raise ValueError("No contract schemas found")
    errors, seen, missing_tests = [], set(), set()
    paths = sorted(p for p in (root / "spec").rglob("*.yaml") if p.parent.name != "schemas")
    if not paths:
        raise ValueError("No specifications found")
    for path in paths:
        try:
            doc = yaml.safe_load(path.read_text())
            if not isinstance(doc, dict) or doc.get("kind") not in schemas:
                raise ValueError("Missing or unsupported contract kind")
            for error in schemas[doc["kind"]].iter_errors(doc):
                errors.append(f"{path.relative_to(root)}: {list(error.path)}: {error.message}")
            identifier = doc.get("id")
            if identifier in seen:
                errors.append(f"Duplicate spec ID: {identifier}")
            seen.add(identifier)
            for scenario in doc.get("scenarios", []):
                target = scenario.get("test_file")
                if target and not (root / target).is_file():
                    missing_tests.add(target)
        except (ValueError, yaml.YAMLError) as error:
            errors.append(f"{path.relative_to(root)}: {error}")
    result = {"specifications": len(paths), "schemaErrors": errors, "missingProductTestFiles": sorted(missing_tests), "scope": "contract schema validation; not application test execution"}
    (root / "artifacts").mkdir(exist_ok=True)
    (root / "artifacts/spec-validation.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    return bool(errors)


if __name__ == "__main__":
    sys.exit(validate())
