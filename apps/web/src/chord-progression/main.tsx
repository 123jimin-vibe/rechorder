import { render } from 'preact';
import { createPlaybackEngine } from '@rechorder/audio';
import { AuditionController } from '../audio/audition';
import { EditorPage } from './page';
import '../styles.css';

const root = document.getElementById('app');
if (!root) throw new Error('Application root is missing.');

const controller = new AuditionController(createPlaybackEngine());
void controller.prepare();
const onVisibility = () => {
  if (document.hidden) controller.stopAll();
};
const onPageHide = (event: PageTransitionEvent) => {
  controller.stopAll();
  if (!event.persisted) void controller.dispose();
};
document.addEventListener('visibilitychange', onVisibility);
window.addEventListener('pagehide', onPageHide);
render(<EditorPage controller={controller} />, root);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
    render(null, root);
    void controller.dispose();
  });
}
