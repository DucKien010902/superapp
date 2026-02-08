import { Ionicons } from "@expo/vector-icons";
import { Pressable, TextInput, View } from "react-native";

export default function SearchBar({
  value,
  onChange,
  onMenuPress,
  placeholder = "Tìm kiếm...",
}: {
  value: string;
  onChange: (t: string) => void;
  onMenuPress?: () => void;
  placeholder?: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Ionicons name="search" size={18} color="#6B7280" />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        style={{
          flex: 1,
          marginLeft: 10,
          fontSize: 15,
          color: "#111827",
        }}
      />
      <Pressable
        onPress={onMenuPress}
        hitSlop={10}
        style={{ paddingLeft: 10 }}
      >
        <Ionicons name="ellipsis-vertical" size={18} color="#6B7280" />
      </Pressable>
    </View>
  );
}
