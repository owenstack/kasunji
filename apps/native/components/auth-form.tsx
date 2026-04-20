import { useAuth, useSignIn, useSignUp } from "@clerk/expo";
import { useForm } from "@tanstack/react-form";
import { Button, FieldError, Input, Label, Tabs, TextField, useToast, InputGroup, InputOTP } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";
import z from "zod";
import { Ionicons } from "@expo/vector-icons";

const authSchema = z.object({
  email: z.email({ message: "Please enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});

const verifySchema = z.object({
  code: z.string().min(1, { message: "Please enter the verification code" }),
});

export function AuthForm() {
  const { toast } = useToast();
  const { isLoaded } = useAuth();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [tab, setTab] = useState<"signIn" | "signUp">("signIn");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [show, setShow] = useState(true);

  const showError = (error: unknown, fallback: string) => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : fallback;

    toast.show({ label: message, variant: "danger" });
  };

  const authForm = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: authSchema,
    },
    onSubmit: async ({ value }) => {
      if (!isLoaded) return;

      if (tab === "signIn") {
        try {
          const { error } = await signIn.password({
            emailAddress: value.email,
            password: value.password,
          });

          if (error) {
            showError(error.message, "Unable to sign in.");
            return;
          }

          if (signIn.status === "complete") {
            const result = await signIn.finalize();
            if (result.error) {
              showError(result.error.message, "Unable to finish signing in.");
            }
          }
        } catch (error) {
          showError(error, "Unable to sign in.");
        }
      } else {
        try {
          const { error } = await signUp.password({
            emailAddress: value.email,
            password: value.password,
          });

          if (error) {
            showError(error.message, "Unable to sign up.");
            return;
          }

          const verification = await signUp.verifications.sendEmailCode();
          if (verification.error) {
            showError(verification.error.message, "Unable to send verification code.");
            return;
          }

          setVerificationEmail(value.email);
          setPendingVerification(true);
        } catch (error) {
          showError(error, "Unable to sign up.");
        }
      }
    },
  });

  const verifyForm = useForm({
    defaultValues: {
      code: "",
    },
    validators: {
      onSubmit: verifySchema,
    },
    onSubmit: async ({ value }) => {
      if (!isLoaded) return;

      try {
        const { error } = await signUp.verifications.verifyEmailCode({ code: value.code });

        if (error) {
          showError(error.message, "Unable to verify code.");
          return;
        }

        if (signUp.status === "complete") {
          const result = await signUp.finalize();
          if (result.error) {
            showError(result.error.message, "Unable to finish signing up.");
            return;
          }
        } else {
          toast.show({
            label: "Could not complete verification. Please try again.",
            variant: "danger",
          });
        }
      } catch (error) {
        showError(error, "Unable to verify code.");
      }
    },
  });

  if (pendingVerification) {
    return (
      <View className="w-full gap-4">
        <Text className="text-2xl font-bold text-center text-foreground">Verify your email</Text>
        <Text className="text-sm text-center text-muted">We sent a code to {verificationEmail}</Text>

        <verifyForm.Field name="code">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <TextField isInvalid={isInvalid} isRequired>
                <Label>Verification code</Label>
                <InputOTP
                  placeholder="Enter verification code"
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  maxLength={6}
                  isInvalid={isInvalid}
                  inputMode="numeric"
              ><InputOTP.Group>
              <InputOTP.Slot index={0} />
              <InputOTP.Slot index={1} />
              </InputOTP.Group>
              <InputOTP.Separator />
              <InputOTP.Group>
              <InputOTP.Slot index={2} />
              <InputOTP.Slot index={3} />
              </InputOTP.Group>
              <InputOTP.Separator />
              <InputOTP.Group>
              <InputOTP.Slot index={4} />
              <InputOTP.Slot index={5} />
              </InputOTP.Group>
                </ InputOTP>
                {isInvalid && <FieldError>{field.state.meta.errors?.[0]?.message}</FieldError>}
              </TextField>
            );
          }}
        </verifyForm.Field>

        <verifyForm.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit]}>
          {([isSubmitting, canSubmit]) => (
            <Button onPress={verifyForm.handleSubmit} isDisabled={!canSubmit || isSubmitting}>
              <Button.Label>{isSubmitting ? "Verifying..." : "Verify"}</Button.Label>
            </Button>
          )}
        </verifyForm.Subscribe>

        <Button
          onPress={async () => {
            const { error } = await signUp.verifications.sendEmailCode();
            if (error) {
              showError(error.message, "Unable to resend verification code.");
            }
          }}
          className="items-center"
        >
            <Button.Label>Resend code</Button.Label>
        </Button>

        <Button variant='secondary'
          onPress={() => {
            setPendingVerification(false);
            verifyForm.reset();
          }}
        >
            <Button.Label>Back to sign up</Button.Label>
        </Button>
      </View>
    );
  }

  const renderFields = () => (
    <View className="w-full gap-4">
      <authForm.Field name="email">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <TextField isInvalid={isInvalid} isRequired>
              <Label>Email address</Label>
              <Input
                placeholder="Enter your email address"
                value={field.state.value}
                onChangeText={field.handleChange}
                onBlur={field.handleBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                isInvalid={isInvalid}
              />
              {isInvalid && <FieldError>{field.state.meta.errors?.[0]?.message}</FieldError>}
            </TextField>
          );
        }}
      </authForm.Field>

      <authForm.Field name="password">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <TextField isInvalid={isInvalid} isRequired>
              <Label>Password</Label>
                <InputGroup>
                <InputGroup.Input placeholder="Enter your password"
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  onBlur={field.handleBlur}
                  secureTextEntry={show}
                  isInvalid={isInvalid}
                />
                <InputGroup.Suffix>
                  <Button variant="ghost" onPress={() => setShow((current) => !current)}>
                    <Ionicons name={show ? "eye-off" : "eye"} size={24} className="text-foreground" />
                  </Button>
                </InputGroup.Suffix>
              </InputGroup>
              {isInvalid && <FieldError>{field.state.meta.errors?.[0]?.message}</FieldError>}
            </TextField>
          );
        }}
      </authForm.Field>
      <authForm.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit]}>
        {([isSubmitting, canSubmit]) => (
          <Button onPress={authForm.handleSubmit} isDisabled={!canSubmit || isSubmitting}>
            <Button.Label>
              {isSubmitting
                ? tab === "signIn"
                  ? "Signing in..."
                  : "Signing up..."
                : tab === "signIn"
                  ? "Sign in"
                  : "Sign up"}
            </Button.Label>
          </Button>
        )}
      </authForm.Subscribe>
    </View>
  );

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        setTab(value as "signIn" | "signUp");
        authForm.reset();
      }}
    >
      <Tabs.List>
        <Tabs.Indicator />
        <Tabs.Trigger value="signIn">
          <Tabs.Label>Sign In</Tabs.Label>
        </Tabs.Trigger>
        <Tabs.Trigger value="signUp">
          <Tabs.Label>Sign Up</Tabs.Label>
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="signIn">{renderFields()}</Tabs.Content>
      <Tabs.Content value="signUp">{renderFields()}</Tabs.Content>
    </Tabs>
  );
}
