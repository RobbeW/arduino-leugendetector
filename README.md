# Interactieve GSR‑Stressmeter (WebSerial + Smoothie)

Dit educatieve Arduino‑project laat **13‑jarige leerlingen** een eenvoudige *stress‑ / leugendetector* bouwen met slechts twee muntstukken, een RGB‑LED en een webpagina. Ze leren daarbij:

* wat **galvanische huidrespons (GSR)** is — en hoe je het kunt meten;
* hoe een **spanningsdeler** en de **analoge ingangen** van een Arduino Uno werken;
* hoe de **WebSerial‑API** seriële data rechtstreeks naar de browser stuurt;
* hoe je met **Smoothie Charts** live‑grafieken tekent in JavaScript;
* welk effect veelvoorkomende **smartphone‑meldingen** hebben op de aandacht en stress.

---

## Hardware‑lijst

| Aantal | Onderdeel | Opmerking |
|-------:|-----------|-----------|
| 1 | Arduino Uno (of Nano) | Elke 5 V‑board met ≥ 1 analoge poort voldoet |
| 2 | Muntstukken (5 ct) | Electrode; vasttapen of met krokodilklemmen |
| 1 | 10 kΩ‑weerstand | Pull‑down in spanningsdeler |
| 1 | RGB‑LED | Visuele feedback (optioneel) |
| 3 | 220 Ω‑weerstanden | Voor R, G, B‑kanaal |
| – | Breadboard & Dupont‑draden | |

> **Budgettip:** alles past in een klassenset van ± € 5.

---

## Mappenstructuur

```text
📦 gsr-stressmeter/
 ┣ media/             ← mp3‑geluiden (whatsapp.mp3 …)
 ┣ index.html         ← web‑interface
 ┣ script.js          ← logica (WebSerial, grafiek, kalibratie)
 ┣ Controller.ino     ← Arduino‑sketch (niet in dit fragment)
 ┗ README.md          ← dit bestand
```

---

## Snelstart (docent)

1. **Flash** `Controller.ino` naar de Uno.
2. Bevestig de twee munten: ene munt naar **5 V**, andere naar **A0**.
3. Start lokaal servertje:
   ```bash
   npx serve .
   ```
4. Open `http://localhost:3000` in Chrome / Edge.
5. Klik **Verbind met microcontroller** en kies de juiste COM‑poort.
6. (Optioneel) klik **Kalibreer (rust)** en blijf 10 s stil.
7. Speel losse meldingen of **Speel sequentie** – volg de **blauwe stresslijn** en **rode markeringen**.

---

## Belangrijkste JavaScript‑onderdelen

* **WebSerial** streamt elke ± 30 ms een ruwe ADC‑waarde.
* **Smoothie Chart** plot continu met een vaste schaal (0‑100 %).
* **Kalibreerknop** meet 10 s baseline en range per leerling.
* **Rode markerSeries** toont precies wanneer een geluid afgespeeld werd zonder de y‑as te verschuiven.
* **CustomEvent ‘raw‑gsr’** geeft de kalibratielus passief toegang tot ruwe data.

---

## Lesideeën

1. **Signaal vs. ruis** – leerlingen bewegen, bevochtigen vingers; herkennen artefacten.
2. **Interventieontwerp** – welke melding (Teams, Whatsapp …) geeft de grootste stresspiek?
3. **Ethiek** – mag je op basis van GSR conclusies trekken over emoties? privacy? toestemming?
4. **Uitbreiding** – meerdere GSR‑kanalen of “pro‑electrodes” (ECG‑pads).

---

## Probleemoplossing

| Probleem | Oplossing |
|----------|-----------|
| **Verbindknop** doet niets | Gebruik Chrome/Edge via **HTTPS** of **localhost**; WebSerial werkt anders niet. |
| **Grafiek vlak** | Controleer bedrading; 10 kΩ moet tussen A0 en GND. Doe kalibratie. |
| **Rode strepen maken schaal raar** | SCHAAL staat vast op 0‑100 % – zie `SmoothieChart`‑config. |
| **Waarde 1023** | Pin zweeft: elektrode los of verkeerd aangesloten. |

---

## Licentie & copyright

MIT‑licentie. Vrij te hergebruiken voor educatieve doeleinden **mits** vermelding:

> © 2025 Robbe Wulgaert – Sint‑Lievenscollege Gent / AI in de Klas

Bij publicatie graag deze credit en link naar het oorspronkelijke project behouden.

