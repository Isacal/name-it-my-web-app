#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_Fingerprint.h>
#include <HardwareSerial.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ----------------------
// LCD & BUZZER
// ----------------------
LiquidCrystal_I2C lcd(0x27, 16, 2);
#define BUZZER 4

// ----------------------
// FINGERPRINT SENSOR
// ----------------------
HardwareSerial fingerSerial(1);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fingerSerial);

// ----------------------
// WIFI
// ----------------------
const char* ssid = "Isacal";
const char* password = "80808088";

String api_check = "http://10.11.150.112/smart_attendance/check_student.php";
String api_mark  = "http://10.11.150.112/smart_attendance/mark_attendance.php";

// ----------------------
// HELPERS
// ----------------------
void beepSuccess(){ tone(BUZZER, 1500, 200); }
void beepError(){ tone(BUZZER, 400, 300); }
void beepScan(){ tone(BUZZER, 1200, 80); }

void lcdMsg(String l1, String l2="") {
  lcd.clear();
  lcd.setCursor(0,0); lcd.print(l1);
  lcd.setCursor(0,1); lcd.print(l2);
  Serial.println("[LCD] " + l1 + " | " + l2);
}

// ----------------------
// SETUP
// ----------------------
void setup() {
  Serial.begin(115200);
  pinMode(BUZZER, OUTPUT);

  lcd.init();
  lcd.backlight();
  lcdMsg("Booting...", "");

  Serial.println("------ SYSTEM STARTING ------");

  // WiFi Connection
  lcdMsg("Connecting WiFi");
  Serial.print("Connecting to WiFi");

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED){
    delay(300);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  lcdMsg("WiFi Connected");

  // Fingerprint Sensor Init
  Serial.println("Initializing Fingerprint Sensor...");
  fingerSerial.begin(115200, SERIAL_8N1, 16, 17);
  finger.begin(57600);

  if (!finger.verifyPassword()) {
    Serial.println("[ERROR] Fingerprint sensor not detected!");
    lcdMsg("FP Error!", "Check Wiring");
    beepError();
    while(1);
  }

  Serial.println("Fingerprint sensor OK!");
  lcdMsg("System Ready");
  delay(1000);
}

// ----------------------
// SEND FINGERPRINT TO SERVER
// ----------------------
bool verifyStudent(int fid, int &student_id, String &full_name, String &next_action) {
  Serial.println("Verifying student with Fingerprint ID: " + String(fid));

  HTTPClient http;
  http.begin(api_check);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");

  String body = "fingerprint_id=" + String(fid);
  Serial.println("[POST] Sending: " + body);

  int code = http.POST(body);
  Serial.println("[SERVER] Response Code: " + String(code));

  if(code != 200){
    lcdMsg("Server Error");
    Serial.println("[ERROR] Failed contacting server!");
    beepError();
    return false;
  }

  String res = http.getString();
  Serial.println("[SERVER RESPONSE] " + res);

  DynamicJsonDocument doc(512);
  DeserializationError err = deserializeJson(doc, res);

  if(err){
    Serial.println("[JSON ERROR] " + String(err.c_str()));
    lcdMsg("JSON Error");
    beepError();
    return false;
  }

  if(doc["status"] == "unknown"){
    Serial.println("[INFO] Unknown fingerprint");
    lcdMsg("Unknown Finger");
    beepError();
    return false;
  }

  student_id  = doc["student_id"].as<int>();
  full_name   = doc["full_name"].as<String>();
  next_action = doc["next_action"].as<String>();

  Serial.println("Student ID: " + String(student_id));
  Serial.println("Name: " + full_name);
  Serial.println("Action: " + next_action);

  return true;
}

// ----------------------
// MARK ATTENDANCE
// ----------------------
void markAttendance(int student_id, String action){
  Serial.println("Marking attendance...");
  Serial.println("Student ID: " + String(student_id));
  Serial.println("Action: " + action);

  HTTPClient http;
  http.begin(api_mark);
  http.addHeader("Content-Type","application/x-www-form-urlencoded");

  String post = "student_id=" + String(student_id) +
                "&action=" + action;

  Serial.println("[POST] " + post);

  int code = http.POST(post);
  Serial.println("Server Response Code: " + String(code));

  if(code == 200){
    lcdMsg("Attendance", "Recorded");
    Serial.println("[SUCCESS] Attendance saved!");
    beepSuccess();
  } else {
    lcdMsg("Save Error!");
    Serial.println("[FAILED] Could not save attendance.");
    beepError();
  }

  delay(1500);
}

// ----------------------
// MAIN LOOP
// ----------------------
void loop() {
  lcdMsg("Place Finger");
  Serial.println("Waiting for fingerprint...");

  int p = finger.getImage();

  if(p == FINGERPRINT_NOFINGER){
    delay(200);
    return;
  }

  if(p != FINGERPRINT_OK){
    lcdMsg("Scan Error");
    Serial.println("[SCAN ERROR] getImage() returned: " + String(p));
    beepError();
    delay(800);
    return;
  }

  Serial.println("Image captured OK");
  beepScan();

  finger.image2Tz();
  p = finger.fingerFastSearch();

  if(p != FINGERPRINT_OK){
    lcdMsg("Not Found");
    Serial.println("[MATCH ERROR] No fingerprint matched!");
    beepError();
    delay(1200);
    return;
  }

  int matchID = finger.fingerID;
  Serial.println("Fingerprint match! ID = " + String(matchID));

  int student_id;
  String full_name, next_action;

  if(!verifyStudent(matchID, student_id, full_name, next_action)){
    Serial.println("[ERROR] Student verification failed!");
    return;
  }

  lcdMsg(full_name, next_action);
  Serial.println("Proceeding to mark attendance...");
  delay(1500);

  markAttendance(student_id, next_action);
}
