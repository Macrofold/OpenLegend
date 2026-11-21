# AWS access for Open Legend

For verification machines, read the [managed-worker procedure](verification-workers.md) before provisioning, starting, claiming or using one, including an existing instance. It owns exclusive use, cleanup and the distinction between designed and available tooling; AWS access alone does not grant a claim.

## Project and profile isolation

Use the explicitly selected `openlegend` profile and `us-east-2` Region for Open Legend's current AWS project. Its AWS account ID is `027677879749`; verify it with STS before resource mutations. These settings do not apply to Mike's work projects.

On Mike's current machine, the CLI supporting browser sign-in is `$HOME/.local/bin/aws` (2.38.1 at setup). The ordinary `aws` command remains his work installation. Use the explicit executable and profile, for example:

```sh
"$HOME/.local/bin/aws" sts get-caller-identity --profile openlegend --region us-east-2
```

Do not change the default/work profiles, export a global `AWS_PROFILE`, copy credentials into the repository, or create long-lived access keys to avoid sign-in. Renew only the selected profile when required. Signing in does not authorize unrelated resources, spending or permission changes; the root task policy still applies.

If Mike has renewed the session, repeat the identity check above. A successful identity check for the expected project confirms credential renewal. Continue with the applicable worker ownership and spending checks, including the original campaign and outstanding commitments on resumption. If renewal is still needed, follow the installed AWS sign-in instructions with the explicit Open Legend executable, profile and Region. Ask before running the interactive login command.

The `aws-mcp` Codex connection allows only `AWS_MCP_PROXY_PROFILES=openlegend`, with `AWS_REGION` and `AWS_DEFAULT_REGION` set to `us-east-2` in that server's environment. Its service endpoint is in `us-east-1`; that does not change the project's selected resource Region. Never add a work profile to its allowed list without an explicit request. CLI is the primary path for local files and repeatable commands; MCP provides AWS knowledge and API tools using the same project permissions. An unavailable MCP connection does not require console-based resource management when CLI access works.

Use installed AWS skills selectively for the affected service. Their advice does not override this repository's authorization, engine/world, privacy, spending or verification rules. Existing AWS access is not evidence that infrastructure has been provisioned or production deployment qualified.

## AWS-provided experience guidance

The following guidance is from [AWS's new-experience rules](https://raw.githubusercontent.com/aws/agent-toolkit-for-aws/refs/heads/main/rules/aws-starter-rules.md), distributed under the [Apache 2.0 license](../references/aws-agent-toolkit-LICENSE.txt). It is scoped above and formatted for this repository; existing project instructions take precedence. AWS's live documentation owns service availability and authentication limits.

Mike uses AWS's new experience with social sign-in. The Open Legend project and selected Region are identified above. The project's spending limit, permission and worker cleanup instructions govern routine worker operations. In particular, the runner already has a cleanup decision for its own disposable resources.

### Terminology

- Use “project” for the AWS account and its collaboration settings. People invited by email are “team members.” Say “selected Region” when discussing the project's location.
- Use “AWS Settings” for management of projects, billing, team members and spend limits. Resources are viewed in the AWS Management Console. [AWS Settings](https://settings.aws.com/).
- AWS manages service and resource control policies for the project. Services that call one another still need the applicable IAM policies. [AWS control policies](https://docs.aws.amazon.com/accounts/latest/reference/scps-and-rcps-for-projects.html).

### Regional services and access

- Create regional resources, including Lambda and API Gateway, in the selected Region. Under this experience the user's contact address determines the Region for their projects. To confirm it, use AWS Settings > View all projects > Overview > Additional Info > Region. If unavailable, check the selected profile in `~/.aws/config`.
- CloudFront permits global service actions in `us-east-1`. Its distribution can point to a Lambda function URL or API Gateway in the project's Region. Create WAF or CloudWatch Logs resources in `us-east-1` only for a global dependency that requires it. For a WAF or Logs inventory, check both the selected Region and `us-east-1`. Keeping regional work together avoids cross-Region traffic, cost and availability dependencies.
- The new experience excludes Lambda@Edge, CloudFormation StackSets, cross-Region actions (including DynamoDB/S3/RDS replication and multi-Region KMS keys), and Route 53 geolocation, latency and failover routing. In `eu-north-1` it also excludes Rekognition, Textract, Personalize and App Runner.
- AWS manages human IAM access. Assign roles to team members only when necessary.

### Spending and service availability

- A paid plan can have a spend limit that pauses the project when exceeded. Only project owners can modify that limit. The AWS project limit and the developer's authorization for a task are separate.
- Before paid worker use, verify the project identity, ownership and available task budget under the [worker procedure](verification-workers.md#run-lifecycle). Routine authorized use needs no separate account-plan inquiry.
- If access fails, inspect the service error and selected identity first. When a plan restriction or project spend limit could explain the failure, check the plan or ask Mike to confirm the project’s spend status in AWS Settings > Billing. An expired login uses the renewal procedure above.
- For successfully created resources whose disposition the task leaves open, ask whether the user wants to keep them or clean them up to reduce future charges.
- Use AWS Settings to set up billing, manage spend limits, retrieve invoices and pay them. Use the AWS Billing and Cost Management console for budgets and cost optimization.
- To investigate a possible service-plan restriction:
  1. Check the selected project's plan using `"$HOME/.local/bin/aws" freetier get-account-plan-state --profile openlegend --region us-east-2`.
  2. If `accountPlanType` is `FREE`, check the [Free Tier supported services list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-free-tier).
  3. If `accountPlanType` is `PAID`, check the [Paid Tier supported services list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-paid-plan).
  4. If neither list includes the service, check [services outside this experience](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#unsupported-services). Access to these requires activating advanced features.

### Help level

Mike selected **LOW**. Carry out the authorized request as given. Skip unsolicited alternatives or improvements. Ask if the action would create a security vulnerability or if project policy requires his decision, such as authority to exceed the task budget.

Update the saved level only when Mike requests a change. At **MEDIUM**, execute the request and ask at most two questions for ambiguities or issues. Explain tradeoffs or alternatives on request and leave dismissed questions or suggestions closed. At **HIGH**, explain each step and its purpose before acting, flag best practices and explain tradeoffs, suggest better alternatives where applicable, then honor the user's authorized choice.
