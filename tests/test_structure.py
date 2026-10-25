from pathlib import Path


def test_source_files_exist():
    root = Path(__file__).resolve().parents[1]
    assert (root / "app.py").exists()
    assert (root / "ml-frontend/package.json").exists()
    assert (root / "requirements.txt").exists()
    assert (root / "pytest.ini").exists()
