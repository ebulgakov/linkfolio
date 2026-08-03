<script lang="ts" setup>
import { AuthButtons } from "~/features/auth-buttons";
import { NavMenu } from "~/features/nav-menu";
import { AppLogoWordmark } from "~/shared/ui";
</script>

<template>
  <v-app-bar class="px-4">
    <AppLogoWordmark />
    <v-spacer />
    <AuthButtons />
    <div class="menu">
      <NavMenu />
    </div>
  </v-app-bar>
</template>

<style lang="css" scoped>
.menu {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
