# Alien Customs
**Alien Customs** is a multiplayer browser party game where players compete to be the first customs agent to send all their aliens to Earth.

## How to play

One player creates a game as the **Host**, and everyone else joins as a **Customs Agent**.

Each Agent starts with **20 randomly generated aliens**, each with different characteristics such as:

- Name
- Species
- Number and colour of eyes
- Arms and tentacles
- Height
- Profession
- Hazard level

During each round, Earth announces that it is accepting a limited number of aliens matching a particular requirement:

> 🌍 **Earth is accepting 10 Scientists**

Players race to find matching aliens in their table, select them and send them to Earth.

Spaces are shared between all players and submissions are accepted in the order they reach the Host. This means selecting every matching alien isn't always the best strategy. Someone sending two aliens quickly might beat someone trying to select six.

Accepted aliens leave the player's queue. Rejected aliens stay.

**The first Agent to successfully send all 20 of their aliens to Earth wins.**

## Multiplayer

The game uses **PeerJS** for peer-to-peer multiplayer.

The Host manages the game state, generates Earth Requests, validates submissions and keeps track of the remaining spaces and each Agent's progress.

## Built with

- HTML
- CSS
- JavaScript
- PeerJS
