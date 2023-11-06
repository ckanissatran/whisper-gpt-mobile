import { useState } from "react";
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from "react-native";
import TypeWriter from "react-native-typewriter";
import {
  ActivityIndicator,
  IconButton,
  PaperProvider,
  Text,
} from "react-native-paper";
import { Audio } from "expo-av";

export default function App() {
  const [recording, setRecording] = useState();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function processResponse(currentMessages) {
    // Add try-catch
    const response = await fetch(process.env.EXPO_PUBLIC_GPT_CHAT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_GPT_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: currentMessages,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (response.ok) {
      const data = await response.json();
      console.log("the response was...", data);
      const newMessage = data?.choices?.[0]?.message?.content ?? "";
      if (!!newMessage) {
        setNewMessage(newMessage);
      }
    }
    setIsLoading(false);
  }

  async function transcribeAudio(uri) {
    // Add try-catch
    const formData = new FormData();
    formData.append("file", {
      uri,
      type: "audio/x-m4a",
      name: "audio.m4a",
    });
    formData.append("model", "whisper-1");

    const response = await fetch(process.env.EXPO_PUBLIC_GPT_AUDIO_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_GPT_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.text) {
      let newMessages = [];
      if (!!newMessage) {
        newMessages = [
          ...messages,
          { content: newMessage, role: "assistant" },
          { content: data.text, role: "user" },
        ];
      } else {
        newMessages = [...messages, { content: data.text, role: "user" }];
      }
      setMessages(newMessages);
      setNewMessage("");
      setIsLoading(true);
      await processResponse(newMessages);
    }
  }

  async function startRecording() {
    try {
      console.log("Requesting permissions..");
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log("Starting recording..");
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      console.log("Recording started");
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  }

  async function stopRecording() {
    console.log("Stopping recording..");
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    const uri = recording.getURI();
    console.log("Recording stopped and stored at", uri);
    await transcribeAudio(uri);
  }

  return (
    <PaperProvider>
      <SafeAreaView>
        <StatusBar style="auto" />
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={{
              flex: 1,
              justifyContent: "flex-end",
              margin: 5,
              padding: 10,
              borderRadius: 5,
              shadowColor: "#000",
              backgroundColor: "white",
              shadowOpacity: 0.4,
              elevation: 3,
            }}
          >
            {messages?.map((obj, i) => (
              <View
                key={`${i}-${obj.content}`}
                style={{
                  elevation: 4,
                  shadowOpacity: 0.4,
                  shadowColor: "#000",
                  backgroundColor:
                    obj.role === "user" ? "lightskyblue" : "palegreen",
                  padding: 10,
                  margin: 5,
                  borderRadius: 5,
                  marginLeft: obj.role === "user" ? 50 : 0,
                  marginRight: obj.role === "user" ? 0 : 50,
                  alignSelf: obj.role === "user" ? "flex-end" : "flex-start", 
                }}
              >
                <Text
                  variant="bodyMedium"
                  style={{ textAlign: obj.role === "user" ? "right" : "left" }}
                >
                  {obj.content}
                </Text>
              </View>
            ))}
            {newMessage && (
              <View
                style={{
                  elevation: 4,
                  shadowOpacity: 0.4,
                  shadowColor: "#000",
                  backgroundColor: "palegreen",
                  padding: 10,
                  margin: 5,
                  borderRadius: 5,
                  marginRight: 50,
                  alignSelf: 'left'
                }}
              >
                <TypeWriter
                  style={{ textAlign: "left", paddingRight: 40 }}
                  typing={1}
                  initialDelay={0}
                  delayMap={[
                    // increase delay by 10ms at index 4
                    { at: 4, delay: 10 },
                    // increase delay by 40ms following every '.' character
                    { at: ".", delay: 40 },
                    // decrease delay by 20ms following every '!' character
                    { at: /!/, delay: -20 },
                  ]}
                >
                  {newMessage}
                </TypeWriter>
              </View>
            )}
          </ScrollView>
          <View
            style={{
              alignItems: "center",
              height: 110,
              justifyContent: "center",
            }}
          >
            {isLoading ? (
              <ActivityIndicator animating={true} color="blue" size="large" />
            ) : (
              <IconButton
                style={{ backgroundColor: "lightgrey" }}
                onPress={recording ? stopRecording : startRecording}
                iconColor={recording ? "black" : "red"}
                animated={true}
                size={80}
                icon={recording ? "stop" : "record"}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: StatusBar.currentHeight,
    backgroundColor: "aliceblue",
    height: "100%",
    justifyContent: "flex-end",
  },
});
