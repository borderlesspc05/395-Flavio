import type { Locale } from '../constants/locales';

export type TranslationTree = {
  nav: {
    hub: string;
    diagnostic: string;
    design: string;
    diffusion: string;
    team: string;
    domain: string;
    loop: string;
    account: string;
    logout: string;
    openMenu: string;
    skipToContent: string;
  };
  account: {
    eyebrow: string;
    title: string;
    subtitle: string;
    profileSection: string;
    profileHint: string;
    name: string;
    email: string;
    emailHint: string;
    plan: string;
    memberSince: string;
    saveProfile: string;
    profileSaved: string;
    securitySection: string;
    securityHint: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    changePassword: string;
    passwordChanged: string;
    preferencesSection: string;
    preferencesHint: string;
    language: string;
    languageSaved: string;
    loading: string;
    planLoading: string;
    errors: {
      passwordMismatch: string;
      passwordWeak: string;
      wrongPassword: string;
      requiresRecentLogin: string;
      generic: string;
    };
  };
};

export const translations: Record<Locale, TranslationTree> = {
  pt: {
    nav: {
      hub: 'Hub (MID)',
      diagnostic: '1 · Diagnóstico',
      design: '2 · Design (Blueprint)',
      diffusion: '3 · Difusão',
      team: 'Equipe',
      domain: '4 · Domínio (MID)',
      loop: 'Loop contínuo',
      account: 'Conta',
      logout: 'Sair',
      openMenu: 'Abrir menu de navegação',
      skipToContent: 'Ir para o conteúdo principal',
    },
    account: {
      eyebrow: 'Configurações',
      title: 'Minha conta',
      subtitle: 'Gerencie seu perfil, segurança e idioma da plataforma.',
      profileSection: 'Informações do perfil',
      profileHint: 'Nome exibido no app e dados vinculados à sua assinatura.',
      name: 'Nome',
      email: 'Email',
      emailHint: 'O email não pode ser alterado aqui.',
      plan: 'Plano atual',
      memberSince: 'Membro desde',
      saveProfile: 'Salvar perfil',
      profileSaved: 'Perfil atualizado com sucesso.',
      securitySection: 'Segurança',
      securityHint: 'Para trocar a senha, confirme a senha atual.',
      currentPassword: 'Senha atual',
      newPassword: 'Nova senha',
      confirmPassword: 'Confirmar nova senha',
      changePassword: 'Alterar senha',
      passwordChanged: 'Senha alterada com sucesso.',
      preferencesSection: 'Preferências',
      preferencesHint: 'Escolha o idioma da interface.',
      language: 'Idioma',
      languageSaved: 'Idioma atualizado.',
      loading: 'Carregando…',
      planLoading: 'Carregando plano…',
      errors: {
        passwordMismatch: 'As senhas não coincidem.',
        passwordWeak: 'A nova senha deve ter pelo menos 6 caracteres.',
        wrongPassword: 'Senha atual incorreta.',
        requiresRecentLogin: 'Faça login novamente e tente alterar a senha.',
        generic: 'Não foi possível concluir a operação. Tente novamente.',
      },
    },
  },
  en: {
    nav: {
      hub: 'Hub (MID)',
      diagnostic: '1 · Diagnostic',
      design: '2 · Design (Blueprint)',
      diffusion: '3 · Diffusion',
      team: 'Team',
      domain: '4 · Domain (MID)',
      loop: 'Continuous loop',
      account: 'Account',
      logout: 'Sign out',
      openMenu: 'Open navigation menu',
      skipToContent: 'Skip to main content',
    },
    account: {
      eyebrow: 'Settings',
      title: 'My account',
      subtitle: 'Manage your profile, security, and platform language.',
      profileSection: 'Profile information',
      profileHint: 'Display name in the app and data linked to your subscription.',
      name: 'Name',
      email: 'Email',
      emailHint: 'Email cannot be changed here.',
      plan: 'Current plan',
      memberSince: 'Member since',
      saveProfile: 'Save profile',
      profileSaved: 'Profile updated successfully.',
      securitySection: 'Security',
      securityHint: 'To change your password, confirm your current password.',
      currentPassword: 'Current password',
      newPassword: 'New password',
      confirmPassword: 'Confirm new password',
      changePassword: 'Change password',
      passwordChanged: 'Password changed successfully.',
      preferencesSection: 'Preferences',
      preferencesHint: 'Choose the interface language.',
      language: 'Language',
      languageSaved: 'Language updated.',
      loading: 'Loading…',
      planLoading: 'Loading plan…',
      errors: {
        passwordMismatch: 'Passwords do not match.',
        passwordWeak: 'New password must be at least 6 characters.',
        wrongPassword: 'Current password is incorrect.',
        requiresRecentLogin: 'Please sign in again and try changing your password.',
        generic: 'Could not complete the operation. Please try again.',
      },
    },
  },
  es: {
    nav: {
      hub: 'Hub (MID)',
      diagnostic: '1 · Diagnóstico',
      design: '2 · Diseño (Blueprint)',
      diffusion: '3 · Difusión',
      team: 'Equipo',
      domain: '4 · Dominio (MID)',
      loop: 'Bucle continuo',
      account: 'Cuenta',
      logout: 'Salir',
      openMenu: 'Abrir menú de navegación',
      skipToContent: 'Ir al contenido principal',
    },
    account: {
      eyebrow: 'Configuración',
      title: 'Mi cuenta',
      subtitle: 'Administre su perfil, seguridad e idioma de la plataforma.',
      profileSection: 'Información del perfil',
      profileHint: 'Nombre mostrado en la app y datos vinculados a su suscripción.',
      name: 'Nombre',
      email: 'Correo',
      emailHint: 'El correo no se puede cambiar aquí.',
      plan: 'Plan actual',
      memberSince: 'Miembro desde',
      saveProfile: 'Guardar perfil',
      profileSaved: 'Perfil actualizado con éxito.',
      securitySection: 'Seguridad',
      securityHint: 'Para cambiar la contraseña, confirme la contraseña actual.',
      currentPassword: 'Contraseña actual',
      newPassword: 'Nueva contraseña',
      confirmPassword: 'Confirmar nueva contraseña',
      changePassword: 'Cambiar contraseña',
      passwordChanged: 'Contraseña cambiada con éxito.',
      preferencesSection: 'Preferencias',
      preferencesHint: 'Elija el idioma de la interfaz.',
      language: 'Idioma',
      languageSaved: 'Idioma actualizado.',
      loading: 'Cargando…',
      planLoading: 'Cargando plan…',
      errors: {
        passwordMismatch: 'Las contraseñas no coinciden.',
        passwordWeak: 'La nueva contraseña debe tener al menos 6 caracteres.',
        wrongPassword: 'Contraseña actual incorrecta.',
        requiresRecentLogin: 'Inicie sesión de nuevo e intente cambiar la contraseña.',
        generic: 'No se pudo completar la operación. Inténtelo de nuevo.',
      },
    },
  },
};
