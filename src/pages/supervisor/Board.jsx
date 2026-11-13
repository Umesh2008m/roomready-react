import SectionTabs from '../../components/SectionTabs.jsx';

export default function Board() {
  return (
    <div className="page is-fit">
      <div className="page-head">
        <div>
          <h1 className="page-title">The board</h1>
        </div>
        <SectionTabs personaId="supervisor" />
      </div>
    </div>
  );
}