import {
  Icon,
  Pressable,
  Toast,
  ToastDescription,
  ToastTitle,
  VStack,
} from "@gluestack-ui/themed";
import { X } from "lucide-react-native";

type Props = {
  id: string;
  title: string;
  description?: string;
  type: "error" | "success";
  onClose: () => void;
};

export function ToastMessage({
  id,
  title,
  description,
  type = "success",
  onClose,
}: Props) {
  return (
    <Toast
      nativeID={`toast-${id}`}
      action={type}
      bgColor={type === "success" ? "$green500" : "$red500"}
      mt="$10"
    >
      <VStack space="xs" w="$full">
        <Pressable alignSelf="flex-end" onPress={onClose}>
          <Icon as={X} color="$coolGray50" size="md" />
        </Pressable>

        <ToastTitle color="$white" fontFamily="$heading">
          {title}
        </ToastTitle>

        {description && (
          <ToastDescription color="$white" fontFamily="$body">
            {description}
          </ToastDescription>
        )}
      </VStack>
    </Toast>
  );
}
