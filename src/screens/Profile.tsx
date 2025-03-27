import { Button } from "@components/Button";
import { Input } from "@components/Input";
import { ScreenHeader } from "@components/ScreenHeader";
import { UserPhoto } from "@components/UserPhoto";
import { Center, Heading, Text, VStack, useToast } from "@gluestack-ui/themed";
import { ScrollView, TouchableOpacity } from "react-native";
import * as yup from "yup";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useState } from "react";
import { ToastMessage } from "@components/ToastMessage";
import { Controller, useForm } from "react-hook-form";
import { useAuth } from "@hooks/useAuth";
import { yupResolver } from "@hookform/resolvers/yup";
import { AppError } from "@utils/AppError";
import { api } from "@services/api";
import defaultUserPhotoImagem from "@assets/userPhotoDefault.png";

type FormDataProps = {
  name: string;
  email: string;
  password?: string | null | undefined;
  old_password?: string | null | undefined;
  confirm_password?: string | null;
};

const profileSchema = yup.object({
  name: yup.string().required("Informe o nome"),
  email: yup.string().email("E-mail inválido").required("Informe o e-mail"),
  old_password: yup
    .string()
    .nullable()
    .transform((value) => (!!value ? value : null)),
  password: yup
    .string()
    .min(6, "A senha deve ter pelo menos 6 dígitos")
    .nullable()
    .transform((value) => (!!value ? value : null)),
  confirm_password: yup
    .string()
    .nullable()
    .transform((value) => (!!value ? value : null))
    .oneOf([yup.ref("password")], "As senhas devem ser iguais")
    .when("password", {
      is: (field: any) => field,
      then: (schema) =>
        schema
          .nullable()
          .required("Informe a confirmação da senha")
          .transform((value) => (!!value ? value : null)),
    }),
});

export function Profile() {
  const [isUpdating, setIsUpdating] = useState(false);
  const toast = useToast();
  const { user, updateUserProfile } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormDataProps>({
    defaultValues: {
      name: user.name,
      email: user.email,
    },
    resolver: yupResolver<FormDataProps>(profileSchema),
  });

  async function handleUserPhotoSelect() {
    try {
      const photoSelected = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        aspect: [4, 4],
        allowsEditing: true,
      });

      if (photoSelected.canceled) {
        return;
      }

      const photoURI = photoSelected.assets[0].uri;

      if (photoURI) {
        const photoInfo = (await FileSystem.getInfoAsync(photoURI)) as {
          size: number;
        };

        if (photoInfo.size && photoInfo.size / 1024 / 1024 > 5) {
          return toast.show({
            placement: "top",
            render: ({ id }) => (
              <ToastMessage
                id={id}
                type="error"
                title="Essa imagem é muito grande. Escolha uma de até 5MB"
                onClose={() => toast.close(id)}
              />
            ),
          });
        }

        const fileExtension = photoSelected.assets[0].uri.split(".").pop();
        const photoFile = {
          name: `${user.name}.${fileExtension}`.toLowerCase(),
          uri: photoSelected.assets[0].uri,
          type: `${photoSelected.assets[0].type}/${fileExtension}`,
        } as any;

        const userPhotoUploadForm = new FormData();
        userPhotoUploadForm.append("avatar", photoFile);

        const response = await api.patch("/users/avatar", userPhotoUploadForm, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const userUpdated = user;
        userUpdated.avatar = response.data.avatar;

        updateUserProfile(userUpdated);

        toast.show({
          placement: "top",
          render: ({ id }) => (
            <ToastMessage
              id={id}
              type="success"
              title="Foto atualizada!"
              onClose={() => toast.close(id)}
            />
          ),
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function handleProfileUpdate(data: FormDataProps) {
    try {
      setIsUpdating(true);

      const userUpdated = user;
      userUpdated.name = data.name;

      await api.put("/users", data);
      await updateUserProfile(userUpdated);

      toast.show({
        placement: "top",
        render: ({ id }) => (
          <ToastMessage
            title="Perfil atualizado com sucesso."
            type="success"
            id={id}
            onClose={() => toast.close(id)}
          />
        ),
      });
    } catch (error) {
      const isAppError = error instanceof AppError;
      const title = isAppError
        ? error.message
        : "Não foi possível atualizar o perfil.";

      toast.show({
        placement: "top",
        render: ({ id }) => (
          <ToastMessage
            title={title}
            type="error"
            id={id}
            onClose={() => toast.close(id)}
          />
        ),
      });
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <VStack flex={1}>
      <ScreenHeader title="Perfil" />

      <ScrollView contentContainerStyle={{ paddingBottom: 36 }}>
        <Center mt="$6" px="$10">
          <UserPhoto
            source={
              user.avatar
                ? { uri: `${api.defaults.baseURL}/avatar/${user.avatar}` }
                : defaultUserPhotoImagem
            }
            alt="Foto do usuário"
            size="xl"
          />
          <TouchableOpacity onPress={handleUserPhotoSelect}>
            <Text
              color="$green500"
              fontFamily="$heading"
              fontSize="$md"
              mt="$2"
              mb="$8"
            >
              Alterar Foto
            </Text>
          </TouchableOpacity>

          <Center w="$full" gap="$4">
            <Controller
              control={control}
              name="name"
              render={({ field: { value, onChange } }) => (
                <Input
                  placeholder="Nome"
                  bg="$gray600"
                  onChangeText={onChange}
                  value={value}
                  errorMessage={errors.name?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { value, onChange } }) => (
                <Input
                  placeholder="E-mail"
                  bg="$gray600"
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </Center>

          <Heading
            alignSelf="flex-start"
            fontFamily="$heading"
            color="$gray200"
            fontSize="$md"
            mt="$12"
            mb="$2"
          >
            Alterar Senha
          </Heading>

          <Center w="$full" gap="$4">
            <Controller
              control={control}
              name="old_password"
              render={({ field: { onChange } }) => (
                <Input
                  placeholder="Senha Antiga"
                  bg="$gray600"
                  secureTextEntry
                  onChangeText={onChange}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange } }) => (
                <Input
                  placeholder="Nova Senha"
                  bg="$gray600"
                  secureTextEntry
                  onChangeText={onChange}
                  errorMessage={errors.password?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="confirm_password"
              render={({ field: { onChange } }) => (
                <Input
                  placeholder="Confirme e nova Senha"
                  bg="$gray600"
                  secureTextEntry
                  onChangeText={onChange}
                  errorMessage={errors.confirm_password?.message}
                />
              )}
            />

            <Button
              title="Atualizar"
              onPress={handleSubmit(handleProfileUpdate)}
              isLoading={isUpdating}
            />
          </Center>
        </Center>
      </ScrollView>
    </VStack>
  );
}
