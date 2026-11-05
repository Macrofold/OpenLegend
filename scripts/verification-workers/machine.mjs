// docs/technical/verification-workers.md#prepared-environment-and-source-fidelity
// Baked installation receipts survive imaging; cloud-init's marker proves this instance finished bootstrapping.
export const bootReady = 'test -f /var/lib/cloud/instance/boot-finished || exit 75; ';
// The one VM definition used by experiment and clean-image preparation owners.
export function machine(config, worker, script) {
  if (!Number.isSafeInteger(worker.deadline))
    throw new Error('A machine needs its absolute admitted deadline.');
  // This guard precedes package/network setup, so a stalled bootstrap does not need Node or Lambda to stop.
  const epoch = Math.ceil((worker.deadline + 120000) / 1000);
  const guarded =
    `#!/bin/bash\nset -e\nremaining=$(( ${epoch} - $(date +%s) ))\nif test \"$remaining\" -le 0; then shutdown -h now; exit 1; fi\nshutdown -h +$(( (remaining + 59) / 60 ))\n` +
    script;

  return {
    ImageId: config.imageId,
    InstanceType: config.instanceType,
    MinCount: 1,
    MaxCount: 1,
    ClientToken: worker.creationToken,
    IamInstanceProfile: { Name: `${config.pool}-${worker.workerId}` },
    NetworkInterfaces: [
      {
        DeviceIndex: 0,
        AssociatePublicIpAddress: true,
        SubnetId: config.subnetId,
        Groups: [config.securityGroupId],
      },
    ],
    MetadataOptions: { HttpTokens: 'required', HttpPutResponseHopLimit: 1 },
    InstanceInitiatedShutdownBehavior: 'stop',
    BlockDeviceMappings: [
      {
        DeviceName: '/dev/sda1',
        Ebs: { VolumeSize: 64, VolumeType: 'gp3', Encrypted: true, DeleteOnTermination: true },
      },
    ],
    TagSpecifications: ['instance', 'volume', 'network-interface'].map((ResourceType) => ({
      ResourceType,
      Tags: [
        { Key: 'OpenLegendVerificationPool', Value: config.pool },
        { Key: 'Name', Value: `${config.pool}-${worker.workerId}` },
      ],
    })),
    UserData: Buffer.from(guarded).toString('base64'),
  };
}

// EC2 explicitly rejected a one-instance launch; transport/unknown failures retain their original intent.
export const launchRejected = (error) =>
  [
    'UnauthorizedOperation',
    'InvalidParameterValue',
    'InvalidAMIID.NotFound',
    'InsufficientInstanceCapacity',
    'InstanceLimitExceeded',
    'VcpuLimitExceeded',
  ].includes(error.name);
