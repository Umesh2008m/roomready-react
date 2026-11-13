import SectionTabs from '../../components/SectionTabs.jsx';

export default function Work() {
  return (
    <div className="page is-fit">
      <div className="page-head">
        <div>
          <h1 className="page-title">Work</h1>
        </div>
        <SectionTabs personaId="supervisor" />
      </div>
    </div>
  );
}