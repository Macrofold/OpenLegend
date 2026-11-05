// One template owns the control plane. Instances are the controller's bounded registered slots.
export function template(capacity = 2) {
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 128)
    throw new Error('Worker capacity must be 1–128.');
  const numbers = Array.from({ length: capacity }, (_, index) => index + 1);
  const ref = (name) => ({ Ref: name }),
    sub = (value) => ({ 'Fn::Sub': value });
  const get = (name, field) => ({ 'Fn::GetAtt': [name, field] });
  const trust = (service) => ({
    Version: '2012-10-17',
    Statement: [{ Effect: 'Allow', Principal: { Service: service }, Action: 'sts:AssumeRole' }],
  });
  const allow = (Action, Resource, Condition) => ({
    Effect: 'Allow',
    Action,
    Resource,
    ...(Condition ? { Condition } : {}),
  });
  const functionArn = sub(
    'arn:${AWS::Partition}:lambda:${AWS::Region}:${AWS::AccountId}:function:${AWS::StackName}-controller',
  );
  const owned = {
    StringEquals: { 'ec2:ResourceTag/OpenLegendVerificationPool': ref('AWS::StackName') },
  };
  const resources = {
    Artifacts: {
      Type: 'AWS::S3::Bucket',
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
      Metadata: {
        'com.aws.cloudformation.Context': {
          why: 'Private content-addressed source and collected run artifacts; no legacy versions.',
          must: ['Required results are not lifecycle eligible until collected.'],
        },
      },
      Properties: {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          IgnorePublicAcls: true,
          BlockPublicPolicy: true,
          RestrictPublicBuckets: true,
        },
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            { ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } },
          ],
        },
        LifecycleConfiguration: {
          Rules: [
            {
              Id: 'DisposableOnly',
              Status: 'Enabled',
              TagFilters: [{ Key: 'disposable', Value: 'true' }],
              ExpirationInDays: 7,
            },
            {
              Id: 'AbandonedMultipart',
              Status: 'Enabled',
              AbortIncompleteMultipartUpload: { DaysAfterInitiation: 1 },
            },
          ],
        },
      },
    },
    ArtifactPolicy: {
      Type: 'AWS::S3::BucketPolicy',
      Properties: {
        Bucket: ref('Artifacts'),
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Deny',
              Principal: '*',
              Action: 's3:*',
              Resource: [get('Artifacts', 'Arn'), sub('${Artifacts.Arn}/*')],
              Condition: { Bool: { 'aws:SecureTransport': 'false' } },
            },
          ],
        },
      },
    },
    Coordination: {
      Type: 'AWS::DynamoDB::Table',
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
      Metadata: {
        'com.aws.cloudformation.Context': {
          why: 'Atomic stopped-worker claims and finite task allocations.',
          must: ['Never TTL-delete active claims or unsettled financial records.'],
        },
      },
      Properties: {
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [
          { AttributeName: 'pk', AttributeType: 'S' },
          { AttributeName: 'group', AttributeType: 'S' },
          { AttributeName: 'order', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'group-order',
            KeySchema: [
              { AttributeName: 'group', KeyType: 'HASH' },
              { AttributeName: 'order', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'KEYS_ONLY' },
          },
        ],
        KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }],
        SSESpecification: { SSEEnabled: true },
      },
    },
    Network: {
      Type: 'AWS::EC2::SecurityGroup',
      Properties: {
        GroupDescription: 'Verification workers: outbound services, no inbound listeners',
        VpcId: ref('VpcId'),
        SecurityGroupIngress: [],
        SecurityGroupEgress: [
          { IpProtocol: 'tcp', FromPort: 443, ToPort: 443, CidrIp: '0.0.0.0/0' },
          { IpProtocol: 'udp', FromPort: 53, ToPort: 53, CidrIp: '0.0.0.0/0' },
          { IpProtocol: 'tcp', FromPort: 53, ToPort: 53, CidrIp: '0.0.0.0/0' },
          { IpProtocol: 'udp', FromPort: 123, ToPort: 123, CidrIp: '169.254.169.123/32' },
        ],
      },
    },
    ControllerRole: {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: trust('lambda.amazonaws.com'),
        Policies: [
          {
            PolicyName: 'ControlOwnedWorkers',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                allow(
                  [
                    'dynamodb:GetItem',
                    'dynamodb:PutItem',
                    'dynamodb:DeleteItem',
                    'dynamodb:UpdateItem',
                    'dynamodb:ConditionCheckItem',
                    'dynamodb:TransactWriteItems',
                    'dynamodb:Query',
                  ],
                  [get('Coordination', 'Arn'), sub('${Coordination.Arn}/index/*')],
                ),
                allow(
                  ['s3:GetObject', 's3:PutObject', 's3:PutObjectTagging'],
                  sub('${Artifacts.Arn}/*'),
                ),
                allow(
                  ['ec2:DescribeInstances', 'ec2:DescribeInstanceStatus', 'ec2:DescribeImages'],
                  '*',
                ),
                allow('cloudtrail:LookupEvents', '*'),
                // AMI creation authorizes the source instance and both new image/snapshot resources.
                allow(
                  'ec2:CreateImage',
                  sub('arn:${AWS::Partition}:ec2:${AWS::Region}:${AWS::AccountId}:instance/*'),
                  owned,
                ),
                allow(
                  'ec2:CreateImage',
                  [
                    sub('arn:${AWS::Partition}:ec2:${AWS::Region}::image/*'),
                    sub('arn:${AWS::Partition}:ec2:${AWS::Region}::snapshot/*'),
                  ],
                  {
                    StringEquals: {
                      'aws:RequestTag/OpenLegendVerificationPool': ref('AWS::StackName'),
                    },
                  },
                ),
                allow(
                  'ec2:DeregisterImage',
                  sub('arn:${AWS::Partition}:ec2:${AWS::Region}::image/*'),
                  owned,
                ),
                allow(
                  'ec2:DeleteSnapshot',
                  sub('arn:${AWS::Partition}:ec2:${AWS::Region}::snapshot/*'),
                  owned,
                ),
                allow('lambda:InvokeFunction', functionArn),
                allow(
                  ['ec2:RunInstances'],
                  [
                    sub('arn:${AWS::Partition}:ec2:${AWS::Region}::image/${ImageId}'),
                    sub(
                      'arn:${AWS::Partition}:ec2:${AWS::Region}:${AWS::AccountId}:subnet/${SubnetId}',
                    ),
                    sub(
                      'arn:${AWS::Partition}:ec2:${AWS::Region}:${AWS::AccountId}:security-group/${Network}',
                    ),
                  ],
                ),
                allow(
                  ['ec2:RunInstances'],
                  ['instance', 'network-interface', 'volume'].map((type) =>
                    sub(`arn:\${AWS::Partition}:ec2:\${AWS::Region}:\${AWS::AccountId}:${type}/*`),
                  ),
                  {
                    StringEquals: {
                      'aws:RequestTag/OpenLegendVerificationPool': ref('AWS::StackName'),
                    },
                  },
                ),
                allow(
                  ['ec2:CreateTags'],
                  [
                    sub('arn:${AWS::Partition}:ec2:${AWS::Region}:${AWS::AccountId}:*/*'),
                    sub('arn:${AWS::Partition}:ec2:${AWS::Region}::image/*'),
                    sub('arn:${AWS::Partition}:ec2:${AWS::Region}::snapshot/*'),
                  ],
                  { StringEquals: { 'ec2:CreateAction': ['RunInstances', 'CreateImage'] } },
                ),
                allow(
                  [
                    'ec2:StartInstances',
                    'ec2:StopInstances',
                    'ec2:TerminateInstances',
                    'ec2:GetConsoleOutput',
                  ],
                  sub('arn:${AWS::Partition}:ec2:${AWS::Region}:${AWS::AccountId}:instance/*'),
                  owned,
                ),
                allow(
                  'iam:PassRole',
                  sub(
                    'arn:${AWS::Partition}:iam::${AWS::AccountId}:role/${AWS::StackName}-worker-*',
                  ),
                  {
                    StringEquals: { 'iam:PassedToService': 'ec2.amazonaws.com' },
                  },
                ),
                allow(
                  'ssm:SendCommand',
                  sub('arn:${AWS::Partition}:ssm:${AWS::Region}::document/AWS-RunShellScript'),
                ),
                allow(
                  'ssm:SendCommand',
                  sub('arn:${AWS::Partition}:ec2:${AWS::Region}:${AWS::AccountId}:instance/*'),
                  {
                    StringEquals: {
                      'ssm:resourceTag/OpenLegendVerificationPool': ref('AWS::StackName'),
                    },
                  },
                ),
                allow(['ssm:GetCommandInvocation', 'ssm:ListCommands'], '*'),
                allow(
                  ['logs:CreateLogStream', 'logs:PutLogEvents'],
                  sub(
                    'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/lambda/${AWS::StackName}-controller:*',
                  ),
                ),
                allow(
                  ['scheduler:GetSchedule', 'scheduler:UpdateSchedule'],
                  sub(
                    'arn:${AWS::Partition}:scheduler:${AWS::Region}:${AWS::AccountId}:schedule/default/${AWS::StackName}-recovery',
                  ),
                ),
                allow('iam:PassRole', get('RecoveryRole', 'Arn'), {
                  StringEquals: { 'iam:PassedToService': 'scheduler.amazonaws.com' },
                }),
              ],
            },
          },
        ],
      },
    },
    Logs: {
      Type: 'AWS::Logs::LogGroup',
      Properties: {
        LogGroupName: sub('/aws/lambda/${AWS::StackName}-controller'),
        RetentionInDays: 7,
      },
    },
    Controller: {
      Type: 'AWS::Lambda::Function',
      Properties: {
        FunctionName: sub('${AWS::StackName}-controller'),
        Role: get('ControllerRole', 'Arn'),
        Runtime: 'nodejs24.x',
        Handler: 'index.handler',
        MemorySize: 256,
        Timeout: 60,
        ReservedConcurrentExecutions: 16,
        Environment: {
          Variables: {
            BUNDLE_KEY: ref('BundleKey'),
            BUNDLE_DIGEST: ref('BundleDigest'),
            BUCKET: ref('Artifacts'),
            WORKER_CONFIG: sub(
              JSON.stringify({
                pool: '${AWS::StackName}',
                table: '${Coordination}',
                bucket: '${Artifacts}',
                functionName: '${AWS::StackName}-controller',
                capacity,
                warmSlots: Math.min(2, capacity),
                subnetId: '${SubnetId}',
                securityGroupId: '${Network}',
                imageId: '${ImageId}',
                instanceType: 'm7i.xlarge',
                hourlyMicroUsd: '${HourlyMicroUsd}',
                storageMicroUsd: 2000000,
                bootstrapKey: '${BootstrapKey}',
                expiresAt: '${ExpiresAt}',
              }),
            ),
          },
        },
        Code: {
          ZipFile: `const {S3Client,GetObjectCommand}=require('@aws-sdk/client-s3'); const {writeFile}=require('node:fs/promises'); const {createHash}=require('node:crypto'); let loaded; exports.handler=async(event,context)=>{if(!process.env.BUNDLE_KEY)throw Error('Control plane not installed');if(!loaded){const s=new S3Client({maxAttempts:1});const r=await s.send(new GetObjectCommand({Bucket:process.env.BUCKET,Key:process.env.BUNDLE_KEY}),{abortSignal:AbortSignal.timeout(15000)});const b=await r.Body.transformToByteArray();if(createHash('sha256').update(b).digest('hex')!==process.env.BUNDLE_DIGEST)throw Error('Controller checksum mismatch');await writeFile('/tmp/controller.mjs',b,{mode:384});loaded=await import('file:///tmp/controller.mjs');}return loaded.handler(event,context);};`,
        },
      },
    },
    ControllerDelivery: {
      Type: 'AWS::Lambda::EventInvokeConfig',
      Properties: {
        FunctionName: ref('Controller'),
        Qualifier: '$LATEST',
        MaximumRetryAttempts: 0,
        MaximumEventAgeInSeconds: 60,
      },
    },
    RecoveryRole: {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { Service: 'scheduler.amazonaws.com' },
              Action: 'sts:AssumeRole',
              Condition: {
                StringEquals: { 'aws:SourceAccount': ref('AWS::AccountId') },
                ArnLike: {
                  'aws:SourceArn': sub(
                    'arn:${AWS::Partition}:scheduler:${AWS::Region}:${AWS::AccountId}:schedule-group/default',
                  ),
                },
              },
            },
          ],
        },
        Policies: [
          {
            PolicyName: 'InvokeRecovery',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [allow('lambda:InvokeFunction', functionArn)],
            },
          },
        ],
      },
    },
    Recovery: {
      Type: 'AWS::Scheduler::Schedule',
      Properties: {
        Name: sub('${AWS::StackName}-recovery'),
        ScheduleExpression: 'rate(1 minute)',
        FlexibleTimeWindow: { Mode: 'OFF' },
        State: ref('RecoveryState'),
        Target: {
          Arn: functionArn,
          RoleArn: get('RecoveryRole', 'Arn'),
          Input: '{"action":"tick"}',
          RetryPolicy: { MaximumRetryAttempts: 0, MaximumEventAgeInSeconds: 60 },
        },
      },
    },
  };
  for (const number of numbers) {
    resources[`WorkerRole${number}`] = {
      Type: 'AWS::IAM::Role',
      Properties: {
        RoleName: sub(`\${AWS::StackName}-worker-${number}`),
        AssumeRolePolicyDocument: trust('ec2.amazonaws.com'),
        ManagedPolicyArns: [
          sub('arn:${AWS::Partition}:iam::aws:policy/AmazonSSMManagedInstanceCore'),
        ],
        Policies: [
          {
            PolicyName: 'OwnedSlot',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                allow('dynamodb:GetItem', get('Coordination', 'Arn'), {
                  'ForAllValues:StringEquals': {
                    'dynamodb:LeadingKeys': [`worker:slot-${number}`],
                  },
                  Null: { 'dynamodb:LeadingKeys': 'false' },
                }),
                allow('s3:GetObject', [
                  sub('${Artifacts.Arn}/control/*'),
                  sub('${Artifacts.Arn}/sources/*'),
                  sub(`\${Artifacts.Arn}/workers/slot-${number}/*`),
                ]),
                allow('s3:PutObject', sub(`\${Artifacts.Arn}/workers/slot-${number}/*`)),
                allow('lambda:InvokeFunction', functionArn),
              ],
            },
          },
        ],
      },
    };
    resources[`WorkerProfile${number}`] = {
      Type: 'AWS::IAM::InstanceProfile',
      Properties: {
        InstanceProfileName: sub(`\${AWS::StackName}-slot-${number}`),
        Roles: [ref(`WorkerRole${number}`)],
      },
    };
  }
  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Description:
      'OpenLegend development verification: exclusive worker slots, finite spending, no public game ingress.',
    Metadata: {
      AWSToolsMetrics: { AWSAgentToolkit: 'aws-cloudformation@3' },
      'com.aws.cloudformation.Context': {
        ref: 'docs/technical/verification-workers.md',
        must: [
          'Only controller mutates claims.',
          'Retain required evidence and financial receipts.',
        ],
      },
    },
    Parameters: {
      VpcId: { Type: 'AWS::EC2::VPC::Id' },
      SubnetId: { Type: 'AWS::EC2::Subnet::Id' },
      ImageId: { Type: 'AWS::EC2::Image::Id' },
      BundleKey: { Type: 'String', Default: '' },
      BundleDigest: { Type: 'String', Default: '' },
      BootstrapKey: { Type: 'String', Default: '' },
      ExpiresAt: { Type: 'String' },
      HourlyMicroUsd: { Type: 'Number', Default: 206600, MinValue: 1 },
      RecoveryState: {
        Type: 'String',
        Default: 'DISABLED',
        AllowedValues: ['ENABLED', 'DISABLED'],
      },
    },
    Resources: resources,
    Outputs: {
      Bucket: { Value: ref('Artifacts') },
      Table: { Value: ref('Coordination') },
      Function: { Value: ref('Controller') },
      Region: { Value: ref('AWS::Region') },
    },
  };
}
