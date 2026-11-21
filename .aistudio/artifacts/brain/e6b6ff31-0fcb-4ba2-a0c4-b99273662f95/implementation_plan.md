# Cronache del Vento — JRPG Enhancements & New Content Plan

Enhancing the JRPG adventure in the Valle di Rondine with new playable characters, expanded story chapters and side quests, tactical turn-based combat skills and spells, and robust quality-of-life features (multiple save slots and auto-save indicators).

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your clarifying choices, we are focusing on narrative expansion, tactical combat depth, and save management.

- **Confirmed Content**: Add new playable characters and story chapters, plus new side quests and exploration regions in Valle di Rondine.
- **Confirmed Combat**: Implement tactical turn-based battle skills and elemental spells.
- **Confirmed QoL**: Support multiple save slots (3 save slots) with visual auto-save indicators and persistent localStorage management.

---

## 1. Overview & Core Concept

- **What It Does**: Expands the retro HD-2D JRPG *Cronache del Vento* with rich new content, deep tactical combat choices during battles, and reliable save slot management.
- **Target Audience / Persona**: JRPG enthusiasts and players exploring the Valle di Rondine story.
- **Key Value**: Richer narrative playtime, more engaging elemental battle mechanics, and peace of mind through multiple save slots.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. *Save Slot Management*: Access save/load menu from the title screen or in-game pause menu, selecting among 3 save slots with timestamps and chapter info.
  2. *Story & Side Quests*: Encounter new NPCs in towns, accept side quests, and unlock new exploration areas in Valle di Rondine.
  3. *Tactical Combat*: In battle encounters, select from enhanced physical skills and elemental spells (Fire, Wind, Ice) with animated feedback and cooldowns/mana points (MP).
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Retro 16-bit HD-2D pixel art style consistent with the existing game canvas (`#0b0d14` dark atmospheric backdrop, warm golden UI panels, clean typography).
  - *Color Palette*: Dominant deep slate canvas, warm parchment gold (`#c9a34a`), rich magical accents (`#5a8fcf`, `#ff7a1a`).
- **Interactive Feedback**: Instant button response, visual auto-save flashing indicator badge, smooth modal overlays for save slots and quest logs.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1**: Client-side localStorage for Multiple Save Slots.
  - *Chosen Approach*: Maintain an array/object structure in `localStorage` supporting 3 distinct save slots.
  - *Why*: Perfectly compatible with the static PWA architecture while giving players freedom to maintain multiple save files.
- **Decision 2**: In-Engine Tactical Skill System.
  - *Chosen Approach*: Expand the existing battle loop in `hd2d.js` / `index.html` to include skill selection menus, MP consumption, and status effects.
  - *Why*: Enhances tactical depth without requiring external heavy dependencies.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   index.html / hd2d.js                 │
│  (Game Engine, Canvas Renderer, Input Handler, Audio)  │
└───────────┬────────────────────────────────┬───────────┘
            │                                │
            ▼                                ▼
┌───────────────────────┐        ┌───────────────────────┐
│   Save Slot Manager   │        │  Battle & Skill Engine│
│ (3 Slots, LocalStorage│        │ (MP, Spells, Status)  │
│  Auto-save indicator) │        └───────────────────────┘
└───────────────────────┘                    │
                                             ▼
                                 ┌───────────────────────┐
                                 │ New Chapters & Quests │
                                 │ (Valle di Rondine)    │
                                 └───────────────────────┘
```

- **Data Model & State**:
  - `saveSlots`: Array of 3 save objects storing player level, position, inventory, active chapter, and timestamp.
  - `quests`: Registry of active and completed side quests.
  - `battleState`: Extended turn-based attributes including MP, skill tree, and spell animations.
- **Interactive Component & State Mapping**: Save slot selection triggers immediate state serialization/deserialization; spell selection in battle subtracts MP and applies damage calculations.
