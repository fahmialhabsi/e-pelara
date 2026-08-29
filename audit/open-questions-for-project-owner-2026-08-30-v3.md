# Open Questions for Project Owner

1. Is the deployed architecture shared multi-tenant or isolated database/deployment per institution, and which tenant/OPD boundary is authoritative for each domain?
2. Who is the named data owner and independent verifier for planning, financial, MR/TLHP, documents, Account Registry, FoodOps, and e-SIGAP integration data?
3. Is `ADMINISTRATOR` strictly OPD-scoped, and what formally approved emergency-access procedure exists?
4. Must `PENGAWAS` be unable to post, void, delete, or alter financial transactions in every financial route?
5. Is Account Registry global platform metadata or tenant-scoped operational data, and which vault/KMS owns reusable secrets?
6. What are the production database engine/version, topology, scheduler, object storage, reverse proxy, IAM provider, and `NODE_ENV` configuration?
7. What are approved RPO/RTO/SLA/SLO and capacity targets per service tier, and when was the last restore/load drill?
8. Are GitHub branch protection, required checks, CODEOWNERS, secret scanning, dependency scanning, and deployment approvals enabled for the remediation branch and main?
9. Which official local SPBE, records, signature, data-protection, interoperability, and publication policies apply to this deployment?
10. Which migration set is authoritative when the repository inventory reports 531 files but the previous audit reported 271?
11. Has the project owner approved a residual-risk decision for every Critical/High finding that cannot be closed before pilot or launch?
12. Is e-SIGAP source code deployed and reachable, or is `e-pelara-integration/` only an integration blueprint?
