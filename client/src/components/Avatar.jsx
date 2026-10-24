import { initials } from '../utils/format';

export default function Avatar({ user, size = 36 }) {
  const style = { width: size, height: size, fontSize: size * 0.38 };
  if (user?.avatar) return <img className="vb-avatar" src={user.avatar} alt="" style={style} />;
  return <span className="vb-avatar" style={style} aria-hidden="true">{initials(user)}</span>;
}
