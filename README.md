# DecentraHire

DecentraHire is a next-generation, trustless freelance marketplace built natively on GenLayer. It is designed to completely eliminate platform middlemen, arbitrary fees, and subjective human dispute resolution by leveraging the power of AI-driven consensus.

## 🎯 The Problem

Traditional freelance platforms suffer from three major systemic flaws:
1. **Extortionate Fees:** Platforms act as rent-seeking middlemen, often taking up to 20% of a freelancer's earnings simply for hosting the marketplace.
2. **Subjective Disputes:** When client-freelancer disagreements occur, resolution relies on underpaid human support agents who lack the technical context to make fair, objective decisions.
3. **Walled Gardens:** A freelancer's hard-earned reputation is locked into the specific platform. If the platform bans them or changes its algorithm, their career history is erased.

## 💡 The DecentraHire Solution

DecentraHire replaces the corporate middleman with code. By utilizing GenLayer's execution environment, the platform uses **Intelligent Contracts** to independently manage escrow, evaluate complex deliverables, and execute final payouts without human intervention. 

### Core Mechanics

* **Trustless Escrow:** Clients define their exact job requirements and lock the project funds in an on-chain escrow. The funds are mathematically secured and can only be released when the predefined conditions are verifiably met.
* **Objective AI Evaluation:** When a freelancer finishes a task, they submit their deliverable as a public URL (e.g., a GitHub repository, a Figma file, or a live web deployment). An Intelligent Contract securely fetches the URL, reads its contents, and evaluates the work strictly against the client's original criteria. 
* **LLM Consensus:** The evaluation isn't done by a single, centralized AI. GenLayer processes the evaluation through an LLM consensus mechanism across multiple independent network validators, ensuring the verdict is unbiased, verifiable, and tamper-proof.
* **Automated Dispute Resolution:** If the initial automated review fails, or if a party contests the outcome, the client can initiate a dispute. This triggers a secondary, deeper AI arbitration process that reviews the evidence and issues a final, binding verdict—removing human emotion and bias from the equation entirely.
* **Immutable Reputation:** Every completed job, successful delivery, and dispute outcome is permanently recorded on-chain. This builds a cryptographic reputation score that the user actually owns, rather than renting it from a centralized platform.

## 🔄 Platform Workflow

1. **Job Creation:** The client posts a detailed project specification and deposits the payout into the Intelligent Contract escrow.
2. **Execution:** The freelancer claims the job and builds the project.
3. **Submission:** The freelancer submits the final public URL of their deliverable.
4. **Verification:** The Intelligent Contract accesses the URL and cross-references the deliverable against the initial specifications using decentralized AI consensus.
5. **Resolution:** * *If the criteria are met:* The contract automatically releases the funds to the freelancer's wallet.
   * *If the criteria are not met:* The work is rejected, or the dispute protocol is engaged for deeper arbitration.
6. **Reputation Update:** The outcome is written to the blockchain, updating the permanent reputation score of both parties.

---
*Decentralizing work. Automating trust.*
