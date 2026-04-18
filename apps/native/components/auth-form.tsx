import { useSignIn, useSignUp } from "@clerk/expo";
import { useForm } from "@tanstack/react-form";
import { Button, FieldError, Input, Label, Tabs, TextField, useToast } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";
import z from "zod";

const authSchema = z.object({
  email: z.email({ message: "Please enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});

const verifySchema = z.object({
  code: z.string().min(1, { message: "Please enter the verification code" }),
});

export function AuthForm() {
  const { toast } = useToast();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [tab, setTab] = useState<"signIn" | "signUp">("signIn");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  const authForm = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: authSchema,
    },
    onSubmit: async ({ value }) => {
      if (tab === "signIn") {
        try {
          const { error } = await signIn.password({
            emailAddress: value.email,
            password: value.password,
          });
          if (error) {
            toast.show({ label: error.longMessage ?? error.message, variant: "danger" });
            return;
          }
          if (signIn.status === "complete") {
            await signIn.finalize();
          }
        } catch (error) {
          toast.show({ label: (error as Error).message, variant: "danger" });
        }
      } else {
        try {
          const { error } = await signUp.password({
            emailAddress: value.email,
            password: value.password,
          });
          if (error) {
            toast.show({ label: error.longMessage ?? error.message, variant: "danger" });
            return;
          }
          await signUp.verifications.sendEmailCode();
          setVerificationEmail(value.email);
          setPendingVerification(true);
        } catch (error) {
          toast.show({ label: (error as Error).message, variant: "danger" });
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
      try {
        await signUp.verifications.verifyEmailCode({ code: value.code });
        if (signUp.status === "complete") {
          await signUp.finalize();
        } else {
          toast.show({ label: "Could not complete verification. Please try again.", variant: "danger" });
        }
      } catch (error) {
        toast.show({ label: (error as Error).message, variant: "danger" });
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
                <Input
                  placeholder="Enter verification code"
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  onBlur={field.handleBlur}
                  keyboardType="number-pad"
                  isInvalid={isInvalid}
                />
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

        <Button onPress={() => signUp.verifications.sendEmailCode()} className="items-center">
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
              <Input
                placeholder="Enter your password"
                value={field.state.value}
                onChangeText={field.handleChange}
                onBlur={field.handleBlur}
                secureTextEntry
                isInvalid={isInvalid}
              />
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
                  ? "Sign In"
                  : "Sign Up"}
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
