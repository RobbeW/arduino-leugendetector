// lie_detector.ino – GSR lie detector met RGB LED en WebSerial output
// Basislijn en bereik afgestemd op eigen metingen

#include <Arduino.h>

typedef unsigned long ul;
const int GSR_PIN   = A0;    // Analoge pin voor GSR-sensor
const int RED_PIN   = 9;     // PWM-uitgang rood
const int GREEN_PIN = 10;    // PWM-uitgang groen
const int BLUE_PIN  = 11;    // PWM-uitgang blauw

int breathValue     = 0;     // Helderheid ademhalings­effect
int breathDirection = 1;     // 1 = ophelderen, -1 = dimmen

const int GSR_MIN   = 0;     // Meetwaarde zonder aanraking
const int GSR_MAX   = 70;    // Meetwaarde bij 'natte vingers'

void setup() {
  pinMode(RED_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  pinMode(BLUE_PIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int gsrValue = analogRead(GSR_PIN);
  Serial.println(gsrValue);

  int stress = map(gsrValue, GSR_MIN, GSR_MAX, 0, 255);
  stress = constrain(stress, 0, 255);

  if (stress < 100) {
    breathingEffect();
  } else {
    flashingEffect();
  }

  delay(30);
}

void breathingEffect() {
  breathValue += breathDirection * 5;
  if (breathValue >= 255) {
    breathValue = 255;
    breathDirection = -1;
  } else if (breathValue <= 0) {
    breathValue = 0;
    breathDirection = 1;
  }

  analogWrite(GREEN_PIN, breathValue);
  analogWrite(RED_PIN, 0);
  analogWrite(BLUE_PIN, 0);
}

void flashingEffect() {
  static bool flashState = false;
  static ul lastFlash = 0;
  ul currentTime = millis();
  if (currentTime - lastFlash > 200) {
    flashState = !flashState;
    lastFlash = currentTime;
  }
  analogWrite(RED_PIN, flashState ? 255 : 0);
  analogWrite(GREEN_PIN, 0);
  analogWrite(BLUE_PIN, 0);
}