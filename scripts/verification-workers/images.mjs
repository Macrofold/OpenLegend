// Clean tools-only images use a fresh registered slot and the same bootstrap/VM definition.
import {
  EC2Client,
  RunInstancesCommand,
  DescribeInstancesCommand,
  CreateImageCommand,
  DescribeImagesCommand,
  TerminateInstancesCommand,
  StopInstancesCommand,
  GetConsoleOutputCommand,
  DeregisterImageCommand,
  DeleteSnapshotCommand,
} from '@aws-sdk/client-ec2';
import { SSMClient, SendCommandCommand, GetCommandInvocationCommand } from '@aws-sdk/client-ssm';
import { clientOptions } from './aws.mjs';
import { machine, launchRejected, bootReady } from './machine.mjs';
import { authenticate, digest, id } from './contracts.mjs';
export const imageCaptureRequest = (config, row) => ({
  InstanceId: row.instanceId,
  Name: `${config.pool}-${row.buildId}`,
  NoReboot: true,
  TagSpecifications: ['image', 'snapshot'].map((ResourceType) => ({
    ResourceType,
    Tags: [
      { Key: 'OpenLegendVerificationPool', Value: config.pool },
      { Key: 'OpenLegendImageBuild', Value: row.buildId },
      { Key: 'OpenLegendImageExpiresAt', Value: String(row.expiresAt) },
    ],
  })),
});
export function images({
  config,
  send,
  read,
  write,
  transact,
  put,
  lock,
  getObject,
  object,
  slots,
}) {
  const ec2 = new EC2Client(clientOptions()),
    ssm = new SSMClient(clientOptions());
  const safe = (row) => {
    const { secretHash, ...value } = row;
    return value;
  };
  function phase(row, value) {
    if (row.phase === value) return;
    row.phase = value;
    (row.timeline ??= []).push({ phase: value, at: Date.now() });
  }
  async function finish(row, worker) {
    return lock('pool', () =>
      lock(`allocation:${row.cloudAllocationId}`, async () => {
        const pool = await read('pool'),
          allocation = await read(`allocation:${row.cloudAllocationId}`);
        delete pool.owners[worker.workerId];
        allocation.reserved -= row.reservation;
        allocation.charged += row.reservation;
        phase(row, row.failure ? 'failed' : 'completed');
        row.finishedAt = Date.now();
        if (row.failure) {
          delete row.group;
          delete row.order;
        }
        await transact([
          put(pool),
          put(allocation),
          put(row),
          put({
            pk: worker.pk,
            workerId: worker.workerId,
            generation: worker.generation,
            state: 'empty',
          }),
        ]);
        return safe(row);
      }),
    );
  }
  return (event) =>
    lock(`image:${id(event.buildId)}`, async () => {
      const pk = `image:${event.buildId}`;
      let row = await read(pk);
      if (event.action === 'image-prepare') {
        if (row) {
          authenticate(row, event.secret);
          if (
            row.source !== event.source ||
            row.sourceHash !== event.sourceHash ||
            row.taskId !== event.taskId ||
            row.cloudAllocationId !== event.cloudAllocationId
          )
            throw new Error('Image build identity was submitted differently.');
          return safe(row);
        }
        id(event.taskId);
        id(event.cloudAllocationId);
        if (!/^[a-f0-9]{40}$/.test(event.source) || !/^[a-f0-9]{64}$/.test(event.sourceHash))
          throw new Error('Image package preparation requires an immutable source.');
        return lock('pool', () =>
          lock(`allocation:${event.cloudAllocationId}`, async () => {
            const allocation = await read(`allocation:${event.cloudAllocationId}`);
            if (
              !allocation ||
              allocation.taskId !== event.taskId ||
              allocation.charged + allocation.reserved + 2000000 > allocation.limit
            )
              throw new Error('Clean image preparation requires a funded $2 cloud reservation.');
            const pool = (await read('pool')) ?? { pk: 'pool', owners: {} };
            if (pool.admissionClosed)
              throw new Error('Pool deployment has closed image admission.');
            const worker = (await slots()).find(
              (w) => w.state === 'empty' && !w.instanceId && !pool.owners[w.workerId],
            );
            if (!worker)
              throw new Error(
                'Image preparation needs an empty managed slot; cached experiment hosts are not image sources.',
              );
            worker.generation++;
            worker.state = 'image-preparing';
            worker.imageBuildId = event.buildId;
            worker.deadline = Date.now() + 900000;
            worker.creationToken = digest(['image', config.pool, event.buildId]);
            pool.owners[worker.workerId] = pk;
            allocation.reserved += 2000000;
            row = {
              pk,
              buildId: event.buildId,
              secretHash: digest(event.secret),
              taskId: event.taskId,
              cloudAllocationId: event.cloudAllocationId,
              workerId: worker.workerId,
              source: event.source,
              sourceHash: event.sourceHash,
              group: 'images',
              order: String(Date.now()),
              phase: 'uploading',
              timeline: [{ phase: 'uploading', at: Date.now() }],
              reservation: 2000000,
              deadline: worker.deadline,
              createdAt: Date.now(),
              expiresAt: Date.now() + 7 * 86400000,
            };
            await transact([
              put(allocation),
              put(pool),
              put(worker),
              put(row, 'attribute_not_exists(pk)'),
            ]);
            return safe(row);
          }),
        );
      }
      if (!row && event.action === 'image-status')
        return { buildId: event.buildId, phase: 'unadmitted' };
      if (event.action !== 'image-maintain') authenticate(row, event.secret);
      if (event.action === 'image-status' || ['retired', 'failed'].includes(row.phase))
        return safe(row);
      if (row.phase === 'uploading' && event.action !== 'image-retire') {
        try {
          await getObject(`sources/${row.source}/${row.sourceHash}.json`);
        } catch (error) {
          if (error.name !== 'NoSuchKey') throw error;
          if (Date.now() < row.deadline) return safe(row);
          return lock(`worker:${row.workerId}`, async () => {
            row.failure = 'not-started';
            return finish(row, await read(`worker:${row.workerId}`));
          });
        }
        phase(row, 'admitted');
        await write(row);
      }
      if (
        ['image-retire', 'image-maintain'].includes(event.action) &&
        row.imageId &&
        row.phase === 'completed' &&
        (event.action === 'image-retire' || row.expiresAt <= Date.now())
      ) {
        try {
          await send(ec2, DeregisterImageCommand, { ImageId: row.imageId });
        } catch (error) {
          if (error.name !== 'InvalidAMIID.NotFound') throw error;
        }
        for (const SnapshotId of row.snapshots ?? [])
          try {
            await send(ec2, DeleteSnapshotCommand, { SnapshotId });
          } catch (error) {
            if (error.name !== 'InvalidSnapshot.NotFound') throw error;
          }
        phase(row, 'retired');
        row.retiredAt = Date.now();
        delete row.group;
        delete row.order;
        await write(row);
        return safe(row);
      }
      if (row.phase === 'completed') return safe(row);
      if (event.action === 'image-retire') {
        if (['capturing', 'retiring'].includes(row.phase))
          throw new Error(
            'Observe this submitted image capture through completion, then retire its image.',
          );
        row.cancelledAt ??= Date.now();
        await write(row);
      }
      if (!['image-advance', 'image-maintain', 'image-retire'].includes(event.action))
        throw new Error('Unknown image operation.');
      return lock(`worker:${row.workerId}`, async () => {
        const worker = await read(`worker:${row.workerId}`),
          bootstrap = await getObject(config.bootstrapKey);
        if (worker.imageBuildId !== row.buildId) throw new Error('Image worker authority changed.');
        if (row.phase === 'blocked') {
          if (event.action === 'image-maintain' && row.deadline > Date.now()) return safe(row);
          if (event.action === 'image-retire') {
            row.failure = 'cancelled';
            row.discardAfter = Date.now();
            phase(row, 'abandoning');
          } else if (row.deadline <= Date.now()) {
            row.failure = 'capture_blocked';
            row.discardAfter = row.blocked.at + 86400000;
            phase(row, 'abandoning');
          } else {
            delete row.blocked;
            phase(row, 'sanitizing');
          }
          await write(row);
        }
        if (row.phase === 'admitted' && (row.cancelledAt || row.deadline <= Date.now())) {
          row.failure = 'not-started';
          return finish(row, worker);
        }
        if (row.phase === 'admitted') {
          phase(row, 'allocating');
          row.recipe = bootstrap.recipe;
          await write(row);
          const script = bootstrap.script.replaceAll('__SLOT__', worker.workerId);
          const userData = '#!/bin/bash\nset -e\nexport OPENLEGEND_IMAGE_PREPARE=1\n' + script;
          // Intent precedes dispatch; a lost response is reconciled by the exact EC2 creation token.
          let result;
          try {
            result = await send(ec2, RunInstancesCommand, machine(config, worker, userData));
          } catch (error) {
            if (!launchRejected(error)) throw error;
            row.failure = {
              name: error.name,
              message: String(error.message).split('Encoded authorization')[0],
            };
            return finish(row, worker);
          }
          worker.instanceId = result.Instances[0].InstanceId;
          row.instanceId = worker.instanceId;
          phase(row, 'preparing');
          await transact([put(worker), put(row)]);
          return safe(row);
        }
        if (row.phase === 'allocating') {
          const found = (
            await send(ec2, DescribeInstancesCommand, {
              Filters: [{ Name: 'client-token', Values: [worker.creationToken] }],
            })
          ).Reservations.flatMap((r) => r.Instances);
          if (found.length !== 1)
            throw new Error('Image creation remains uncertain; no replacement was launched.');
          worker.instanceId = found[0].InstanceId;
          row.instanceId = worker.instanceId;
          phase(row, 'preparing');
          await transact([put(worker), put(row)]);
        }
        const state = (
          await send(ec2, DescribeInstancesCommand, { InstanceIds: [worker.instanceId] })
        ).Reservations[0].Instances[0].State.Name;
        if (
          (row.cancelledAt || row.deadline <= Date.now()) &&
          ['preparing', 'dispatching', 'sanitizing'].includes(row.phase)
        ) {
          row.failure ??= row.cancelledAt ? 'cancelled' : 'preparation_deadline';
          const consoleOutput = await send(ec2, GetConsoleOutputCommand, {
            InstanceId: worker.instanceId,
            Latest: true,
          });
          await object(`workers/${worker.workerId}/images/${row.buildId}/failure.json`, {
            buildId: row.buildId,
            phase: row.phase,
            reason: row.failure,
            consoleOutput,
          });
          phase(row, 'abandoning');
          row.discardAfter = row.cancelledAt ? Date.now() : Date.now() + 86400000;
          await write(row);
        }
        if (row.phase === 'abandoning') {
          if (['pending', 'running'].includes(state)) {
            await send(ec2, StopInstancesCommand, { InstanceIds: [worker.instanceId] });
            return safe(row);
          }
          if (Date.now() < row.discardAfter) return safe(row);
          row.failure ??= 'preparation_deadline';
          phase(row, 'retiring');
          await write(row);
        }
        if (row.phase === 'preparing') {
          if (state !== 'running') return safe(row);
          if (!row.commandId) {
            // This command only observes installation and schedules the trusted sanitizer; no source/fixture is installed.
            phase(row, 'dispatching');
            await write(row);
            try {
              const response = await send(ssm, SendCommandCommand, {
                InstanceIds: [worker.instanceId],
                DocumentName: 'AWS-RunShellScript',
                TimeoutSeconds: 120,
                Parameters: {
                  commands: [
                    bootReady +
                      `test -f /var/lib/openlegend-verification/prepared.json || exit 75; OPENLEGEND_WORKER_SLOT=${worker.workerId} /usr/local/bin/node /opt/openlegend-verification/supervisor.mjs image-seed ${row.buildId} ${row.source} ${row.sourceHash} && systemd-run --quiet --collect --on-active=5 --unit=ol-image-sanitize --setenv=OPENLEGEND_WORKER_SLOT=${worker.workerId} --setenv=AWS_REGION=us-east-2 /usr/local/bin/node /opt/openlegend-verification/supervisor.mjs image-sanitize ${row.buildId} ${row.recipe}`,
                  ],
                  executionTimeout: ['600'],
                },
              });
              row.commandId = response.Command.CommandId;
              phase(row, 'sanitizing');
              await write(row);
            } catch (error) {
              if (error.name === 'InvalidInstanceId') {
                phase(row, 'preparing');
                await write(row);
              } else throw error;
            }
            return safe(row);
          }
        }
        if (['sanitizing', 'dispatching'].includes(row.phase)) {
          if (row.commandId) {
            const command = await send(ssm, GetCommandInvocationCommand, {
              CommandId: row.commandId,
              InstanceId: worker.instanceId,
            });
            if (
              ['Success', 'Failed', 'TimedOut', 'Cancelled'].includes(command.Status) &&
              row.observedCommandId !== row.commandId
            ) {
              await object(
                `workers/${worker.workerId}/images/${row.buildId}/commands/${row.commandId}.json`,
                command,
              );
              row.observedCommandId = row.commandId;
              await write(row);
            }
            if (command.Status === 'Failed' && command.ResponseCode === 75) {
              delete row.commandId;
              phase(row, 'preparing');
              await write(row);
              return safe(row);
            }
            if (['Failed', 'TimedOut', 'Cancelled'].includes(command.Status)) {
              row.cancelledAt ??= Date.now();
              row.failure = 'package_seed_command_failed';
              await write(row);
              return safe(row);
            }
          }
          if (state !== 'stopped') return safe(row);
          const receipt = await getObject(
            `workers/${worker.workerId}/images/${row.buildId}/sanitized.json`,
          );
          if (
            receipt.buildId !== row.buildId ||
            receipt.recipe !== row.recipe ||
            receipt.clean !== true
          )
            throw new Error('No matching clean-image receipt.');
          phase(row, 'capturing');
          await write(row);
          let image;
          try {
            image = await send(ec2, CreateImageCommand, imageCaptureRequest(config, row));
          } catch (error) {
            if (!['UnauthorizedOperation', 'InvalidParameterValue'].includes(error.name))
              throw error;
            row.blocked = {
              name: error.name,
              message: String(error.message).split('Encoded authorization')[0],
              at: Date.now(),
            };
            phase(row, 'blocked');
            await write(row);
            return safe(row);
          }
          row.imageId = image.ImageId;
          await write(row);
          return safe(row);
        }
        if (row.phase === 'capturing') {
          const images = (
            await send(
              ec2,
              DescribeImagesCommand,
              row.imageId
                ? { ImageIds: [row.imageId] }
                : {
                    Owners: ['self'],
                    Filters: [{ Name: 'tag:OpenLegendImageBuild', Values: [row.buildId] }],
                  },
            )
          ).Images;
          if (images.length !== 1)
            throw new Error(
              'Image capture remains uncertain; inspect the original build identity.',
            );
          row.imageId = images[0].ImageId;
          if (images[0].State !== 'available') {
            await write(row);
            return safe(row);
          }
          row.snapshots = images[0].BlockDeviceMappings.flatMap((m) =>
            m.Ebs?.SnapshotId ? [m.Ebs.SnapshotId] : [],
          );
          phase(row, 'retiring');
          await write(row);
        }
        if (row.phase === 'retiring') {
          if (state !== 'terminated') {
            await send(ec2, TerminateInstancesCommand, { InstanceIds: [worker.instanceId] });
            return safe(row);
          }
          return finish(row, worker);
        }
        return safe(row);
      });
    });
}
