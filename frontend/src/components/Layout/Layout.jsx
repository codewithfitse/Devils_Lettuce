import Navbar from './Navbar';

export default function Layout({ children, sidebar }) {
  return (
    <div>
      <Navbar />
      {sidebar ? (
        <div style={{ display: 'flex' }}>
          {sidebar}
          <main className="panel-main">{children}</main>
        </div>
      ) : (
        <main>{children}</main>
      )}
    </div>
  );
}
