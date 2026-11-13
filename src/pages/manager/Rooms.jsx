import SectionTabs from '../../components/SectionTabs.jsx';

export default function Rooms() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Rooms</h1>
        </div>
        <SectionTabs personaId="manager" />
      </div>
    </div>
  );
}