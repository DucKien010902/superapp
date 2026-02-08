import { Stack } from "expo-router";
import React from "react";

export default function NoteLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        title: "Note",
        headerTintColor: "white",
        headerStyle: { backgroundColor: "#070A12" },
        animation:'none'
      }}
    />
  );
}
