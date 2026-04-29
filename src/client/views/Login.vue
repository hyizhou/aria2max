<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/store'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const password = ref('')
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
  error.value = ''
  loading.value = true
  try {
    const success = await authStore.login(password.value)
    if (success) {
      router.push('/dashboard')
    } else {
      error.value = t('auth.loginFailed')
    }
  } catch {
    error.value = t('auth.loginFailed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h2 class="login-title">aria-max</h2>
      <p class="login-subtitle">{{ t('auth.subtitle') }}</p>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <input
            v-model="password"
            type="password"
            class="login-input"
            :placeholder="t('auth.passwordPlaceholder')"
            autofocus
            :disabled="loading"
          />
        </div>
        <p v-if="error" class="login-error">{{ error }}</p>
        <button type="submit" class="login-btn" :disabled="loading || !password">
          {{ loading ? t('auth.logging') : t('auth.login') }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.login-card {
  background: #fff;
  padding: 2.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 360px;
  text-align: center;
}

.login-title {
  margin: 0 0 0.25rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #333;
}

.login-subtitle {
  margin: 0 0 1.5rem 0;
  color: #888;
  font-size: 0.9rem;
}

.form-group {
  margin-bottom: 1rem;
}

.login-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.login-input:focus {
  border-color: #1976d2;
}

.login-error {
  color: #f44336;
  font-size: 0.85rem;
  margin: 0 0 0.75rem 0;
}

.login-btn {
  width: 100%;
  padding: 0.75rem;
  background-color: #1976d2;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.login-btn:hover:not(:disabled) {
  background-color: #1565c0;
}

.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dark-theme .login-page {
  background-color: #1a1a1a;
}

.dark-theme .login-card {
  background: #2d2d2d;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}

.dark-theme .login-title {
  color: #e0e0e0;
}

.dark-theme .login-subtitle {
  color: #888;
}

.dark-theme .login-input {
  background-color: #3d3d3d;
  border-color: #555;
  color: #e0e0e0;
}

.dark-theme .login-input:focus {
  border-color: #64b5f6;
}
</style>
