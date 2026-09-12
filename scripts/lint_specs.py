"""Validate source contracts separately from implementation coverage."""
from pathlib import Path
import argparse
import sys

import yaml
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]


class UniqueLoader(yaml.SafeLoader):
    pass


def mapping(loader, node, deep=False):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in result:
            raise ValueError(f"duplicate YAML key {key!r}")
        result[key] = loader.construct_object(value_node, deep=deep)
    return result


UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, mapping)


def load(path):
    return yaml.load(path.read_text(), Loader=UniqueLoader)


def references(value):
    if isinstance(value, dict):
        for key, child in value.items():
            if key in {"design_system_id", "shell_spec_id", "spec_id", "page_id", "component_id", "fixture_id"}:
                yield child
            elif key in {"domain_ids", "component_dependencies", "scope"}:
                yield from child
            yield from references(child)
    elif isinstance(value, list):
        for child in value:
            yield from references(child)


def run_contract_errors(documents):
    """Keep the shared domain and expanded API run shape aligned."""
    errors = []
    lifecycle = documents.get("domain.mission-lifecycle", {})
    run = next((entity for entity in lifecycle.get("entities", []) if entity["name"] == "execution_run"), {})
    fields = {field["name"]: field for field in run.get("fields", [])}
    if "endedAt" not in fields or "completedAt" in fields:
        errors.append("domain.mission-lifecycle: execution_run must use endedAt, never completedAt")
    expected = set(fields.get("status", {}).get("values", []))
    canonical = {"running", "succeeded", "failed", "budget_exhausted", "blocked", "cancelled"}
    if expected != canonical:
        errors.append("domain.mission-lifecycle: canonical run statuses drifted")
    detail = documents.get("api.mission-detail", {})
    for response in detail.get("responses", []):
        latest = response.get("body", {}).get("properties", {}).get("latestRun")
        if latest:
            properties = latest.get("properties", {})
            if set(properties.get("status", {}).get("enum", [])) != expected:
                errors.append("api.mission-detail: latestRun.status differs from execution_run.status")
            if "endedAt" not in properties or "completedAt" in properties:
                errors.append("api.mission-detail: latestRun must use endedAt")
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--contracts-only", action="store_true", help="Validate YAML contracts without claiming test implementation coverage")
    args = parser.parse_args()
    errors, documents, missing = [], {}, set()
    for path in sorted((ROOT / "spec").glob("*/*.yaml")):
        if path.parent.name == "schemas":
            continue
        label = path.relative_to(ROOT)
        try:
            document = load(path)
            schema = load(ROOT / "spec/schemas" / f"{document['kind']}.schema.yaml")
            Draft202012Validator.check_schema(schema)
            for error in Draft202012Validator(schema).iter_errors(document):
                errors.append(f"{label}: {list(error.path)}: {error.message}")
            identifier = document["id"]
            if identifier in documents:
                errors.append(f"{label}: duplicate spec ID {identifier}")
            documents[identifier] = document
            scenarios = document.get("scenarios", [])
            ids = [scenario["id"] for scenario in scenarios]
            if len(ids) != len(set(ids)):
                errors.append(f"{label}: duplicate scenario ID")
            for scenario in scenarios:
                target = (ROOT / scenario["test_file"]).resolve()
                if not target.is_relative_to(ROOT):
                    errors.append(f"{label}: test path escapes workspace")
                elif not target.is_file():
                    missing.add(scenario["test_file"])
        except (OSError, ValueError, KeyError, TypeError, yaml.YAMLError) as error:
            errors.append(f"{label}: {error}")
    for identifier, document in documents.items():
        for reference in references(document):
            if reference not in documents:
                errors.append(f"{identifier}: unresolved spec reference {reference}")
    errors.extend(run_contract_errors(documents))
    for error in errors:
        print(f"ERROR {error}", file=sys.stderr)
    if not args.contracts_only:
        for path in sorted(missing):
            print(f"MISSING TEST {path}", file=sys.stderr)
    print(f"{len(documents)} specs; {len(errors)} contract errors; {len(missing)} missing test files" + (" (coverage excluded)" if args.contracts_only else ""))
    return 1 if errors or (missing and not args.contracts_only) else 0


if __name__ == "__main__":
    sys.exit(main())
