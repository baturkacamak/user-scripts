import Logger from '../../Logger';
import PubSub from '../../PubSub';
import BaseDownloadStrategy from './BaseDownloadStrategy';

class MediaRecorderStrategy extends BaseDownloadStrategy {
  constructor() {
    super('MediaRecorder');
  }

  // --- Helper method specific to this strategy ---
  async recordFromStreamInternal(video, filename, {downloadFromBlob}) {
    if (!navigator.mediaDevices || !video.captureStream) {
      throw new Error('MediaRecorder API or captureStream() not supported.');
    }
    if (!MediaRecorder.isTypeSupported('video/mp4')) {
      Logger.warn(`Strategy ${this.strategyName}: video/mp4 mimetype not supported. Trying default.`);
    }

    let stream;
    try {
      stream = video.captureStream();
      if (!stream?.active || 0 === stream.getVideoTracks().length) {
        throw new Error('Failed to capture active video stream.');
      }

      const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : undefined;
      const recorder = new MediaRecorder(stream, {mimeType});
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (0 < e.data.size) chunks.push(e.data);
      };

      const recordingStopped = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = (event) => reject(event.error || new Error('MediaRecorder error.'));
      });

      recorder.start();
      Logger.debug(`Strategy ${this.strategyName}: Recording started.`);
      PubSub.publish('download:stream:start', {video, filename});


      const durationMs = Math.min((video.duration || 5), 5) * 1000;
      await new Promise((resolve) => setTimeout(resolve, durationMs));

      if ('recording' === recorder.state) recorder.stop();
      else Logger.warn(`Strategy ${this.strategyName}: Recorder not recording before stop`, {state: recorder.state});

      await recordingStopped;
      PubSub.publish('download:stream:end', {filename});
      Logger.debug(`Strategy ${this.strategyName}: Recording process finished.`);

      if (0 === chunks.length) {
        throw new Error('MediaRecorder did not produce any data chunks.');
      }

      const recordedBlob = new Blob(chunks, {type: recorder.mimeType || 'video/mp4'});
      const finalFilename = filename.replace(/\.mp4$/i, '') + '.' + (recordedBlob.type.split('/')[1] || 'mp4');

      Logger.debug(`Strategy ${this.strategyName}: Blob created from chunks.`, {
        size: recordedBlob.size,
        type: recordedBlob.type,
      });
      await downloadFromBlob(recordedBlob, finalFilename); // Let downloadFromBlob handle logs/events
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
    }
  }

  // --- End Helper method ---

  async attempt(video, filename, helpers) {
    if ('function' === typeof video.captureStream) {
      Logger.debug(`Strategy ${this.strategyName}: Attempting MediaRecorder stream recording fallback.`);
      try {
        await this.recordFromStreamInternal(video, filename, helpers);
        return true; // Initiated (via downloadFromBlob)
      } catch (err) {
        Logger.error(err, `Strategy ${this.strategyName} failed during recording/download.`);
        // Let the main loop catch this error
        throw err;
      }
    }
    return false; // Not applicable
  }
}

export default MediaRecorderStrategy;
