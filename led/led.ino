void setup() {
  pinMode(11, OUTPUT);
  pinMode(12, OUTPUT);
  pinMode(13, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  if (Serial.available() > 0) {
    char data = Serial.read();
    digitalWrite(11, data == '1' ? HIGH : LOW);
    digitalWrite(12, data == '2' ? HIGH : LOW);
    digitalWrite(13, data == '3' ? HIGH : LOW);
  }
}