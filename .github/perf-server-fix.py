from pathlib import Path
p=Path('scripts/performance/profile-server.mjs');s=p.read_text()
s=s.replace('const { base, cookie, epoch, position, seconds } = settings;', 'const { base, cookie, epoch, position, seconds, presenceId } = settings;')
s=s.replace('  await Promise.all([\n    periodic(500', '''  await Promise.all([
    periodic(3000, async i => {
      const response = await fetch(base + '/api/presence', {
        method: 'POST', headers: { cookie, origin: base, 'content-type': 'application/json' },
        body: JSON.stringify({ clientId: presenceId, visible: true, sequence: i + 2 }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw Error('Presence heartbeat failed');
    }),
    periodic(500''')
s=s.replace('game = await createGameServer({ config, production: true, tick: true });', 'game = await createGameServer({ config, production: true, tick: false });',1)
s=s.replace("    const base = 'http://'", "    let base = 'http://'").replace("    const response = await fetch(base + '/api/state');", "    let response = await fetch(base + '/api/state');").replace("    const cookie = response.headers.get('set-cookie')?.split(';')[0];", "    let cookie = response.headers.get('set-cookie')?.split(';')[0];")
old='''    await game.service.control({ paused: true });
    const actor = game.service.world.entities[game.service.controlledEntityId];'''
new='''    await game.service.control({ paused: true });
    await game.service.flush();
    await game.close();
    // Start the actual timer only after scene construction: cold acquisition belongs
    // to the measured first phase, not an incidental setup timer callback.
    game = await createGameServer({ config, production: true, tick: true });
    await new Promise(done => game.server.listen(0, config.host, done));
    base = 'http://' + config.host + ':' + game.server.address().port;
    response = await fetch(base + '/api/state');
    cookie = response.headers.get('set-cookie')?.split(';')[0];
    await response.arrayBuffer();
    if (!cookie) throw Error('No restarted local session');
    const actor = game.service.world.entities[game.service.controlledEntityId];'''
if s.count(old)!=1:raise ValueError('Setup boundary changed')
s=s.replace(old,new).replace('    let seq = 1;\n','')
s=s.replace('''      load = await startLoad({ base, cookie, epoch: game.service.commandEpoch, position, seconds });''','''      const presenceId = 'profile-' + randomUUID();
      load = await startLoad({ base, cookie, epoch: game.service.commandEpoch, position, seconds, presenceId });''')
s=s.replace("        clientId: 'profile-setup',\n        presenceSequence: ++seq,", "        clientId: presenceId,\n        presenceSequence: 1,")
s=s.replace('''        speed,
        elapsedSeconds: elapsed,''','''        speed,
        startingSimTime: sim,
        elapsedSeconds: elapsed,''')
s=s.replace('Real server timer, SQLite, SSE and separate-process HTTP load;', 'Real server timer, SQLite, SSE and separate-process HTTP load with presence heartbeats;')
p.write_text(s)
p=Path('packages/domain/src/kernel.ts');s=p.read_text()
old='''    for (const entity of Object.values(world.entities))
      advanceStatusEffects(world, entity, seconds, events);'''
new='''    for (const [index, entity] of Object.values(world.entities).entries()) {
      advanceStatusEffects(world, entity, seconds, events);
      // Retain saved definition/entity order while letting I/O run during large status phases.
      if ((index + 1) % 32 === 0) yield;
    }'''
if s.count(old)!=1:raise ValueError('Status phase changed')
p.write_text(s.replace(old,new))
