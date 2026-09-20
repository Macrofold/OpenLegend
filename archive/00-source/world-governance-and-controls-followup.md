# U14 — invention governance, ownership, controls and world workshop

Recorded September 19, 2026. The request below is preserved from the user attachment. It authorizes documentation updates, not runtime implementation, sales, provisioning or paid inference.

Design homes: [governance](../03-design-proposals/invention-governance-and-ownership.md), [controls](../03-design-proposals/playability-and-controls.md), [workshop](../03-design-proposals/world-agent-and-workshop.md). Requirements F53–F60 and decisions D42–D49 provide traceability. Five personal and three dynamic slots are suggested counts; free-use worlds is a working label.

## User request

In terms of the world semantics we also should have a way to lock the world from new inventions so new players can't add any new inventions. The main creator of the world should have this capability so at some point they can decide to lock it and no new inventions can be created and only existing actions can be taken by players. The idea is, once this is multiplayer, it may be the case that we don't want hundreds of players adding random new inventions all the time. There can be certain worlds that are locked and certain worlds that are unlocked, and in unlocked worlds players are free to add their own inventions. Also I think if players add actions, they should be able to see All of their own past inventions are linked to their account somewhere so that they can view all of their past inventions across all of the worlds that they are in. This should say which world it's in and it should have all the technical details of the invention and so on.
- Players should be able to own their own inventions, even if they created them in worlds that already existed, just so that if players put a ton of work into creating new inventions and unlocking worlds, they don't feel like they lose that work.
- There should also be worlds where the inventions are free to use. There's a marketplace. In the marketplace of invention packs, every world should have an invention pack that just contains every single invention for that world. For some worlds those invention packs will be freely available for players. That's a decision by the world owner. Those worlds should be marked somehow, maybe they're called "free use worlds" or something, so players can enter those free use worlds, create a bunch of inventions, and then take the entire invention pack for that world and clone it to their own world or something.

Also create a playability controls interface doc of some sort and add the following ideas:  
- When right-clicking on anything, players should be given a menu that's dynamic based on whatever they're clicking on. It should also be dynamic based on what they have in their inventory, their skills and capabilities as a character, potentially even their personality and so on. This list should contain the entirety of all possible actions that the player can take so that they can discover every possible action. There's a type-ahead so whatever they type in, it'll filter it down. The most common actions from players sit at the top of the list. This is always reranked so I guess we also need a way to count the number of times an action is taken by players and by a specific player (in case that specific player wants something to be at the top so that the list can be ordered).
  
  These actions should also be categorized. This should happen automatically and dynamically. For example attacking actions should go under a folder or bucket and crafting should go under a bucket, and things like that.
  
  What I'm picturing is you right-click and you have a type-ahead where you can type anything. You can also follow all the categories and just select items or select actions or you can start typing something brand new. If inventions are allowed and the world is not locked, it'll show an icon like a Sparkle AI icon. If you hover over the icon it'll say "Invent a new action" or "Invent this." And then when triggered, the AI will do all of the invention stuff and also name the action appropriately if the user types something that isn't a great name for it. 
- There should also be key bindings for categories and specific actions. For example if I want to key bind the key C to create, then whenever I press C, all the available create actions should appear in the middle of the screen for me to choose from.
  
  I'm picturing there's a menu bar along the bottom of the screen, kind of like in games where you have spells across the bottom of the screen. There should be a menu of action options across the bottom of the screen. Of course these could be spells if people created spells as actions but they could also be just normal actions. These could be configurable.
  
  If a user binds the key, there should be a set number of quick slots, maybe 5 quick slots, and the user can bind any key to any slot. If they bind a specific action, it'll try to initiate that action. If the action is not available, it grays it out. If they bind it to a category of actions, then when they press that key, a drawer opens up from that slot in the UI and they can choose from the available actions. Again unavailable actions, when shown in a drawer, should be grayed out but go to the bottom of the list.
  
  In addition to these quick slot items, there should be, let's say, 3 dynamic action slots to the left of those that are always updating based on what's happening in the world and giving the user ideas of possible actions to take. These can be categories as well as specific actions. If you walk up near to another agent, one of those actions should be "talk" and you should be able to press a key to talk to them. 

Also add this to the interface doc as well. There should be a world log that's showing a bunch of stuff that's happening in the world for players to see. If the player is in god mode there should be a special world log. This world log should have filterable options so you should be able to filter items by adding filters. You can filter by things like agent actions or new inventions and so on and so forth.

If I wanted to I could filter to see all the new inventions that have been created. These should get saved to a database somewhere that is associated with that world and that invention should contain all the parameters, all the technical parameters of that invention. Its effects on everything, the declarative configuration, any custom scripts, etc., should be visible in that log. 

Also when I create an invention, when I type in a new action that doesn't currently exist, in addition to creating it I should be able to adjust it too. Let's say I created an action and I want to make some sort of change to that action. I should be able to workshop it.  There should be a world agent that I can talk to that has access to:  
- all the new inventions that were created
- all the agents
- all the events in the world
  Basically it has access to the whole world environment: context, all the context of every character, all the state of the world, all the inventions, and the entire log of the world too. It knows what's going on and I should be able to talk to it and ask it to add inventions just directly from there. I should also be able to edit inventions that burned too quickly, make it burn slower, stuff like that. 

 add all this stuff into the right documentation

## Separate agent and player locks — September 19, 2026

Subsequent user clarification (the original request above is preserved):

> Okay we added some documentation for world invention lock mechanisms. There should be separate locks: there should be an agent lock and a player lock.

This updates F53 and D42: owners independently control autonomous agent/NPC invention and player invention. The [governance proposal](../03-design-proposals/invention-governance-and-ownership.md#open-and-locked-invention) specifies the four combinations and proposed admission behavior. This is a documentation change, not runtime implementation.
