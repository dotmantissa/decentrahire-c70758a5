# DecentraHire — GenLayer Intelligent Contract

This directory holds the on-chain Python contract that powers the
DecentraHire frontend.

- **File:** `decentrahire.py`
- **Deployed at:** `0x6f8893aE21847b4B4d37235222b0492729326744`
- **RPC:** `https://studio.genlayer.com/api` (GenLayer Studio)

## Public ABI

| Type  | Function                                                       |
|-------|----------------------------------------------------------------|
| write | `deposit_funds(amount)`                                        |
| write | `withdraw_funds(amount)`                                       |
| write | `post_job(title, description, criteria, payment) -> job_id`    |
| write | `accept_job(job_id)`                                           |
| write | `submit_deliverable(job_id, url)`                              |
| write | `evaluate_deliverable(job_id) -> JSON verdict` (AI)            |
| write | `raise_dispute(job_id, reason)`                                |
| write | `resolve_dispute(job_id) -> JSON verdict` (admin + AI)         |
| write | `cancel_job(job_id)`                                           |
| view  | `get_all_jobs() -> JSON`                                       |
| view  | `get_job(job_id) -> JSON`                                      |
| view  | `get_reputation(wallet) -> JSON`                               |
| view  | `get_balance(wallet) -> int`                                   |
| view  | `get_job_count() -> int`                                       |

The contract uses GenLayer's optimistic-democracy consensus through
`gl.nondet.exec_prompt` + `gl.vm.run_nondet_unsafe` to validate deliverables
against the client's acceptance criteria. The pattern mirrors `audit_escrow.py`
in [`dotmantissa/GenLayer`](https://github.com/dotmantissa/GenLayer).

## Running tests

The tests run in **direct mode** — no Docker, no node, no GenVM. They use the
local `conftest.py` mock SDK identical to the upstream GenLayer test harness.

```bash
cd contracts
pip install pytest
pytest tests/direct -v
```

## Lint

GenLayer Studio currently lints the contract via syntax + dataclass checks.
You can additionally run:

```bash
python -m py_compile contracts/decentrahire.py
```
