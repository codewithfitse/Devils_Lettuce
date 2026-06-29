import Navbar from './Navbar';

export default function Layout({ children, sidebar }) {
  return (
    <div>
      <Navbar />
      {sidebar ? (
        <div style={{ display: 'flex' }}>
          {sidebar}
          <main style={{ flex: 1, padding: '2rem' }}>{children}</main>
        </div>
      ) : (
        <main>{children}</main>
      )}
    </div>
  );
}
