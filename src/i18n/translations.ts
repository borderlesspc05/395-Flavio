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
    photoHint: string;
    photoChange: string;
    photoChoose: string;
    photoTake: string;
    photoCameraTitle: string;
    photoCameraHint: string;
    photoCameraCancel: string;
    photoUploading: string;
    photoSaved: string;
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
      photoInvalidType: string;
      photoTooLarge: string;
      photoUploadFailed: string;
      photoCameraDenied: string;
      photoCameraUnavailable: string;
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
      photoHint: 'Escolha uma imagem da galeria ou tire uma foto com a câmera.',
      photoChange: 'Alterar foto',
      photoChoose: 'Escolher foto',
      photoTake: 'Tirar foto',
      photoCameraTitle: 'Tirar foto de perfil',
      photoCameraHint: 'Posicione seu rosto no centro e toque em capturar.',
      photoCameraCancel: 'Cancelar',
      photoUploading: 'Enviando foto…',
      photoSaved: 'Foto de perfil atualizada.',
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
        photoInvalidType: 'Use uma imagem JPG, PNG, WebP ou GIF.',
        photoTooLarge: 'A imagem deve ter no máximo 5 MB.',
        photoUploadFailed: 'Não foi possível enviar a foto. Tente novamente.',
        photoCameraDenied: 'Permita o acesso à câmera para tirar a foto.',
        photoCameraUnavailable: 'Câmera não disponível neste dispositivo ou navegador.',
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
      photoHint: 'Choose an image from your gallery or take a photo with the camera.',
      photoChange: 'Change photo',
      photoChoose: 'Choose photo',
      photoTake: 'Take photo',
      photoCameraTitle: 'Take profile photo',
      photoCameraHint: 'Center your face and tap capture.',
      photoCameraCancel: 'Cancel',
      photoUploading: 'Uploading photo…',
      photoSaved: 'Profile photo updated.',
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
        photoInvalidType: 'Use a JPG, PNG, WebP, or GIF image.',
        photoTooLarge: 'Image must be 5 MB or smaller.',
        photoUploadFailed: 'Could not upload the photo. Please try again.',
        photoCameraDenied: 'Allow camera access to take a photo.',
        photoCameraUnavailable: 'Camera is not available on this device or browser.',
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
      photoHint: 'Elija una imagen de la galería o tome una foto con la cámara.',
      photoChange: 'Cambiar foto',
      photoChoose: 'Elegir foto',
      photoTake: 'Tomar foto',
      photoCameraTitle: 'Tomar foto de perfil',
      photoCameraHint: 'Centre su rostro y toque capturar.',
      photoCameraCancel: 'Cancelar',
      photoUploading: 'Subiendo foto…',
      photoSaved: 'Foto de perfil actualizada.',
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
        photoInvalidType: 'Use una imagen JPG, PNG, WebP o GIF.',
        photoTooLarge: 'La imagen debe tener como máximo 5 MB.',
        photoUploadFailed: 'No se pudo subir la foto. Inténtelo de nuevo.',
        photoCameraDenied: 'Permita el acceso a la cámara para tomar la foto.',
        photoCameraUnavailable: 'La cámara no está disponible en este dispositivo o navegador.',
      },
    },
  },
};
