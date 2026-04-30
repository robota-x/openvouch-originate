<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import CreateLoanModal from '../components/CreateLoanModal.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const showModal = computed(() => true)
</script>

<template>
  <CreateLoanModal 
    :show="showModal" 
    :attestation-count="auth.attestationCount"
    @close="router.push('/marketplace')" 
    @success="router.push('/my-loans')"
  />
</template>
