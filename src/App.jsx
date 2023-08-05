import './App.css'
import { APPID, APPKEY, DEV_PID, URI } from './constant'

/*
1. 连接 ws_app.run_forever()
2. 连接成功后发送数据 on_open()
2.1 发送开始参数帧 send_start_params()
2.2 发送音频数据帧 send_audio()
2.3 库接收识别结果 on_message()
2.4 发送结束帧 send_finish()
3. 关闭连接 on_close()

库的报错 on_error()
*/

const uri = URI + '?sn=' + crypto.randomUUID();

const ws = new WebSocket(uri);

/**
 * 开始参数帧
 */
const sendStartParams = () => {
  let req = {
    'type': 'START',
    'data': {
        'appid': APPID,  // 网页上的appid
        'appkey': APPKEY,  // 网页上的appid对应的appkey
        'dev_pid': DEV_PID,  // 识别模型
        'cuid': 'yourself_defined_user_id',  // 随便填不影响使用。机器的mac或者其它唯一id，百度计算UV用。
        'sample': 16000,  // 固定参数
        'format': 'pcm'  // 固定参数
    }
  };
  let body = JSON.stringify(req);
  ws.send(body);
  console.log('send START frame with params:' + body);
};

/**
 * 发送二进制音频数据，注意每个帧之间需要有间隔时间
 */
function sendAudio(pcm) {
  console.log(pcm)
  let chunk_ms = 160;  // 160ms的录音
  let chunk_len = 16000 * 2 / 1000 * chunk_ms;
  
  let index = 0;
  let total = pcm.size;
  console.log(`send_audio total=${total}`)
  while (index < total) {
    let end = index + chunk_len;
    if (end >= total) {
      // 最后一个音频数据帧
      end = total;
    }
    let body = pcm.slice(index, end);
    console.log(`try to send audio length ${body.size}, from bytes [${index},${end})`);
    ws.send(body)
    index = end;
    setTimeout(() => {}, chunk_ms / 1000.0);
  }
}

/**
 * 发送结束帧
 */
const sendFinish = () => {
  let req =  {
    'type': 'FINISH'
  };
  let body = JSON.stringify(req);
  ws.send(body);
  console.log('send FINISH frame');
};

/**
 * 发送取消帧
 */
// const sendCancel = () => {
//   let req =  {
//     'type': 'CANCEL'
//   };
//   let body = JSON.stringify(req);
//   ws.send(body);
//   console.log('send FINISH frame');
// };

function isWebSocketConnected() {
  console.log(WebSocket.CLOSED !== WebSocket.CONNECTING);
}

ws.onopen = () => {
  sendStartParams();
  // sendAudio();
  // sendFinish();
  // console.log('thread terminating');
  console.log('WebSocket start.')
};

ws.onmessage = (message) => {
  console.log(message)
};

ws.onclose = () => {
  console.log('WebSocket is closed now.');
};

ws.onerror = (error) => {
  console.log('error:', error)
};

function App() {
  let recorder;
  let chunks = [];
  
  function startRecording() {
    chunks = [];
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function(stream) {
        recorder = new MediaRecorder(stream);
        recorder.ondataavailable = function(e) {
          chunks.push(e.data);
        };
        recorder.start();
      })
      .catch(function(err) {
        console.log('Error: ' + err);
      });
  }
  
  function stopRecording() {
    if (recorder.state === 'inactive') {
      return;
    }
    recorder.stop();
    recorder.stream.getTracks().forEach(function(track) {
      track.stop();
    });
    recorder.onstop = function() {
      // let audio = document.createElement('audio');
      let blob = new Blob(chunks);
      // audio.src = window.URL.createObjectURL(blob);
      // audio.controls = true;
      // document.body.appendChild(audio);
      
      sendAudio(blob);
      sendFinish();
      console.log('thread terminating');
    };
  }

  // // 打开麦克风录音
  // function startRecording() {
  //   // 使用浏览器的Web API获取媒体流
  //   navigator.mediaDevices.getUserMedia({ audio: true })
  //     .then(function(stream) {
  //       // 创建MediaRecorder对象
  //       var mediaRecorder = new MediaRecorder(stream);
        
  //       // 创建一个用于存储录音数据的数组
  //       var chunks = [];
        
  //       // 监听数据可用事件，将数据块添加到数组中
  //       mediaRecorder.addEventListener('dataavailable', function(e) {
  //         chunks.push(e.data);
  //       });
        
  //       // 监听录音结束事件，将录音数据合并为Blob对象
  //       mediaRecorder.addEventListener('stop', function() {
  //         var blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
  //         // 使用URL.createObjectURL()创建录音的URL
  //         // var url = URL.createObjectURL(blob);
  //         // console.log(url);
  //         sendAudio(blob);
  //       });
        
  //       // 开始录
  //       mediaRecorder.start();
        
  //       // 停止录音
  //       setTimeout(function() {
  //         mediaRecorder.stop();
  //       }, 3000);

  //       sendFinish();
  //       console.log('thread terminating');
  //     })
  //     .catch(function(err) {
  //       console.error(err);
  //     });
  // }
  return (
    <div>
      <button onClick={startRecording}>打开麦克风录音</button>
      <button onClick={stopRecording}>停止麦克风录音</button>
    </div>
  )
}

export default App
