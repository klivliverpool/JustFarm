# Bandungrejo Blooms

# ROLE

You are a senior game development team consisting of:

- Game Designer

- Unity-Level Gameplay Programmer (implement in HTML5 + JavaScript)

- Pixel Artist

- UI/UX Designer

- Software Architect

Build a polished indie-quality browser game.

Do not create a prototype.

Do not leave TODOs.

Every feature must be functional.

---

# PROJECT

Title:

JUST FARM

Subtitle:

Game Edukasi Pertanian Desa Bandungrejo

Platform:

Desktop Browser

Technology:

HTML5

CSS3

JavaScript ES6

Canvas API

Resolution:

1920x1080

Target FPS:

60 FPS

---

# GAME CONCEPT

JUST FARM is a 2D top-down farming simulation and educational game set in Bandungrejo Village, Bantur District, Malang, Indonesia.

The objective is to educate players about agricultural pests while providing an enjoyable farming simulation.

Players grow crops, identify pest attacks, choose the correct pesticide, harvest crops, earn money, complete quests, and restore the village's agriculture.

The atmosphere should feel warm, peaceful, and similar to Indonesian countryside.

---

# ART STYLE

Visual Style:

Modern Pixel Art

Inspired by:

• Stardew Valley

• Harvest Moon Friends of Mineral Town

• Fields of Mistria

DO NOT COPY.

Only use those games as quality references.

Everything must have pixel art.

Never use:

colored rectangles

primitive shapes

placeholder graphics

debug visuals

Every object should have beautiful sprites.

---

# MAP

Create one large seamless village map.

The village contains:

Village Gate

Village Hall

Player House

Seed Shop

Pesticide Shop

Fertilizer Warehouse

Corn Plantation

Sugarcane Plantation

Rice Field

Tomato Garden

Chili Garden

River

Bridge

Trees

Flowers

Bushes

Lamp Posts

Wood Fences

Village Roads

Small Forest

NPC Houses

Decorate every area.

Never leave empty spaces.

---

# PLAYER

Player is a young Indonesian farmer.

Features:

Idle Animation

Walk Animation

Run Animation

8-direction movement

Smooth camera follow

Collision

Interaction System

Shadow below player

Keyboard:

WASD = Move

Shift = Run

E = Interact

F = Spray Pesticide

R = Water

Space = Harvest

Q = Change Tool

TAB = Inventory

ESC = Pause

---

# CAMERA

Smooth follow.

Camera should never instantly snap.

Camera must stop at world boundaries.

---

# NPC

Village Chief

Old Farmer

Young Farmer

Seed Seller

Pesticide Seller

Agriculture Expert

Villagers

NPC walk randomly.

NPC have dialogue.

NPC give quests.

NPC explain farming.

---

# CROPS

Create a farming database.

Each crop has:

ID

Name

Sprite

Growth Time

Water Level

Health

Pest Probability

Harvest Value

Growth Stage

Crops:

Corn

Sugarcane

Rice

Tomato

Chili

Growth Stages:

Seed

Sprout

Small Plant

Growing

Mature

Harvest Ready

Every stage must have different sprite.

---

# FARM SYSTEM

Player can:

Prepare Soil

Plant Seed

Water

Spray Pesticide

Harvest

Sell Harvest

Buy Seeds

Buy Pesticides

Buy Fertilizer

Plants require water.

Plants grow over time.

Plants can become sick.

Plants can die.

---

# WEATHER

Sunny

Cloudy

Rain

Rain automatically waters crops.

Weather changes every day.

---

# DAY SYSTEM

Morning

Afternoon

Evening

Night

Time continues automatically.

---

# PEST SYSTEM

Random pest attack.

Pests:

White Grub (Uret)

Whitefly (Kutu Kebul)

Armyworm (Ulat Grayak)

Grasshopper (Belalang)

Every pest has:

Sprite

Animation

Description

Symptoms

Recommended pesticide

Affected crops

Example:

White Grub

Attack:

Sugarcane

Symptoms:

Yellow leaves

Wilted leaves

Weak roots

Treatment:

Soil Insecticide

---

Whitefly

Attack:

Corn

Tomato

Chili

Symptoms:

Yellow leaves

Curled leaves

Virus spread

Treatment:

Systemic Insecticide

---

# DIAGNOSIS SYSTEM

When interacting with infected crop:

Open educational window.

Display:

Crop name

Symptoms

Pest image

Question:

"What pest attacked this crop?"

Player selects answer.

If correct:

Plant survives.

Money +50

XP +10

Educational explanation appears.

If incorrect:

Plant health decreases.

Player loses coins.

Explain why answer is wrong.

---

# SHOP

Seed Shop

Corn Seed

Sugarcane Seed

Rice Seed

Tomato Seed

Chili Seed

Pesticide Shop

Soil Insecticide

Systemic Insecticide

Biological Pesticide

General Insecticide

Water Tank

Fertilizer

---

# INVENTORY

Tabs:

Seeds

Harvest

Pesticides

Tools

Items

Quest Items

Drag and Drop inventory.

Icons for every item.

---

# ECONOMY

Starting Money

500 Coins

Selling Prices

Corn

100

Sugarcane

150

Rice

120

Tomato

110

Chili

130

Display animated coin gain.

---

# QUEST SYSTEM

Tutorial Quest

Talk to Village Chief

Buy Seeds

Plant Corn

Water Corn

Harvest Corn

Sell Corn

Treat Whitefly

Plant Sugarcane

Treat White Grub

Earn 1000 Coins

Harvest 20 Crops

Restore Bandungrejo Agriculture

Game Ending

---

# EDUCATION

Create Encyclopedia.

Every discovered pest unlocks information.

Contains:

Photo

Symptoms

Host Plant

Treatment

Interesting Facts

---

# UI

Pixel UI.

Animated windows.

Inventory.

Dialogue.

Quest Tracker.

Health Bar.

Water Meter.

Money Counter.

Mini Map.

Day & Time.

Weather Icon.

Tool Selection.

---

# AUDIO

Village ambience

Birds

Wind

Walking

Water

Harvest

Coins

Button Click

Pest Sound

Rain

Background Music

---

# SAVE SYSTEM

Automatically save using Local Storage.

Save:

Money

Inventory

Player Position

Plants

Weather

Day

Time

Quest Progress

Unlocked Encyclopedia

---

# GAME OVER

Occurs if:

Money reaches zero.

All crops die.

---

# WIN CONDITION

Complete every main quest.

Harvest:

20 Corn

20 Sugarcane

10 Rice

10 Tomato

10 Chili

Earn 5000 Coins.

Village becomes healthy again.

Credits appear.

---

# CODE QUALITY

Use modular JavaScript.

Separate files.

Organize folders.

Use reusable classes.

No duplicated code.

Comment important logic.

Optimize rendering.

Target 60 FPS.

---

# FINAL REQUIREMENTS

Generate the ENTIRE playable game.

Never use placeholder graphics.

Never use primitive colored rectangles.

Everything must feel like a polished indie farming game.

If the response reaches token limit, automatically continue generating until every file has been completed.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://justfarm.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d31854dd-651d-4513-9b95-6f28f37c0201).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
