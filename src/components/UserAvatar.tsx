type UserAvatarProps = {
  photoURL?: string | null;
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  alt?: string;
};

export function UserAvatar({
  photoURL,
  initials,
  size = 'md',
  className = '',
  alt,
}: UserAvatarProps) {
  const classes = ['user-avatar', `user-avatar--${size}`, className].filter(Boolean).join(' ');

  if (photoURL) {
    return (
      <span className={classes}>
        <img src={photoURL} alt={alt ?? ''} className="user-avatar__img" />
      </span>
    );
  }

  return (
    <span className={classes} aria-hidden={!alt}>
      <span className="user-avatar__initials">{initials}</span>
    </span>
  );
}
