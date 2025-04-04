// Keep only one import statement for THREE
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = null;
        this.obstacles = [];
        this.score = 0;
        this.gameStarted = false;
        
        // 添加敌人和子弹相关属性
        this.enemies = [];
        this.bullets = [];
        this.enemyBullets = [];
        this.playerHealth = 10;
        this.enemiesDestroyed = 0;
        this.totalEnemies = 10;
        this.lastShootTime = 0;
        
        this.init();
        this.createCar(); // 创建汽车
        this.updateCameraPosition();
        this.createEnemies();
        this.updateHUD();
        
        // 直接在构造函数中添加事件监听器
        this.addEventListeners();
        
        // 开始动画循环
        this.animate();
    }

    init() {
        // 设置渲染器
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB); // 天空蓝色
        document.getElementById('game-container').appendChild(this.renderer.domElement);
    
        // 添加环境光和平行光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
    
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 50);
        this.scene.add(directionalLight);
    
        // 创建地面
        const groundGeometry = new THREE.PlaneGeometry(5000, 5000); // 扩大地面尺寸
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a472a,
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -50;
        this.scene.add(ground);
    
        // 设置相机初始位置
        this.camera.position.set(0, 100, 200);
        this.camera.lookAt(0, 50, 0); // 让相机看向场景中心
        
        console.log('场景初始化完成');
    }

    // 添加新方法来设置事件监听器
    addEventListeners() {
        // 点击按钮开始游戏
        const startButton = document.getElementById('start-button');
        if (startButton) {
            startButton.addEventListener('click', () => {
                console.log('按钮被点击');
                this.startGame();
            });
        } else {
            console.error('找不到开始按钮元素!');
        }
        
        // 点击屏幕任何位置开始游戏
        document.addEventListener('click', (e) => {
            console.log('屏幕被点击', e.target);
            if (!this.gameStarted) {
                this.startGame();
            }
        });
        
        // 初始化按键状态对象
        this.keys = {};
        
        // 按键按下事件
        document.addEventListener('keydown', (e) => {
            console.log('按键被按下:', e.key);
            if (!this.gameStarted) {
                this.startGame();
            } else {
                this.handleKeyInput(e);
            }
        });
        
        // 按键释放事件 - 确保正确清除按键状态
        document.addEventListener('keyup', (e) => {
            console.log('按键释放:', e.key);
            if (this.keys) {
                this.keys[e.key] = false;
            }
        });
    }

    // 修改游戏开始方法
    startGame() {
        console.log('尝试开始游戏', this.gameStarted);
        if (!this.gameStarted) {
            this.gameStarted = true;
            
            // 隐藏开始消息
            const startMessage = document.getElementById('start-message');
            if (startMessage) {
                startMessage.style.display = 'none';
            } else {
                console.error('找不到开始消息元素!');
            }
            
            // 重置汽车位置
            if (this.car) {
                this.car.position.set(0, 0, 0);
                this.updateCameraPosition();
            }
            
            // 重置游戏状态
            this.speed = 0;
            this.score = 0;
            this.playerHealth = 10;
            this.enemiesDestroyed = 0;
            this.isGameOver = false;
            
            // 更新HUD
            this.updateHUD();
            
            console.log('游戏已开始!', this.gameStarted);
        }
    }

    // 处理键盘输入
    handleKeyInput(e) {
        if (this.isGameOver) {
            // 游戏结束后，按R键重新开始
            if (e.key === 'r' || e.key === 'R') {
                this.restartGame();
                return;
            }
            return;
        }
        
        console.log('处理键盘输入:', e.key);
        
        if (!this.car) {
            console.error('汽车对象不存在!');
            return;
        }
        
        switch(e.key) {
            case 'ArrowUp':
                this.car.position.y += 2;
                console.log('汽车上升');
                break;
            case 'ArrowDown':
                this.car.position.y -= 2;
                console.log('汽车下降');
                break;
            case 'ArrowLeft':
                this.car.position.z += 2;
                console.log('汽车左转');
                break;
            case 'ArrowRight':
                this.car.position.z -= 2;
                console.log('汽车右转');
                break;
            case 'w':
            case 'W':
                if (this.speed < this.maxSpeed) {
                    this.speed += this.acceleration;
                    console.log('加速:', this.speed);
                }
                break;
            case 's':
            case 'S':
                if (this.speed > 0) {
                    this.speed -= this.acceleration;
                    console.log('减速:', this.speed);
                }
                break;
            case ' ': // 空格键射击
                this.shoot();
                console.log('射击!');
                break;
            case 'r':
            case 'R': // R键重新开始游戏
                this.restartGame();
                break;
        }
    }

    // 添加重新开始游戏的方法
    restartGame() {
        console.log('重新开始游戏');
        
        // 重置游戏状态
        this.gameStarted = false;
        this.isGameOver = false;
        
        // 清除所有敌人
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            this.scene.remove(this.enemies[i]);
        }
        this.enemies = [];
        
        // 清除所有子弹
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.scene.remove(this.bullets[i]);
        }
        this.bullets = [];
        
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            this.scene.remove(this.enemyBullets[i]);
        }
        this.enemyBullets = [];
        
        // 重置汽车位置
        if (this.car) {
            this.car.position.set(0, 0, 0);
        }
        
        // 重置游戏参数
        this.speed = 0;
        this.score = 0;
        this.playerHealth = 10;
        this.enemiesDestroyed = 0;
        this.totalEnemies = 10;
        this.lastShootTime = 0;
        
        // 重新创建敌人
        this.createEnemies();
        
        // 更新HUD
        this.updateHUD();
        
        // 显示开始消息
        const startMessage = document.getElementById('start-message');
        if (startMessage) {
            startMessage.style.display = 'block';
        }
        
        // 重置相机位置
        this.updateCameraPosition();
        
        console.log('游戏已重置，准备重新开始');
    }

    // 创建汽车方法
    createCar() {
        // 创建一个汽车模型
        this.car = new THREE.Group();
        
        // 汽车车身 - 使用长方体
        const bodyGeometry = new THREE.BoxGeometry(20, 10, 15);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x0088ff });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.car.add(body);
        
        // 汽车顶部
        const roofGeometry = new THREE.BoxGeometry(12, 8, 14);
        const roofMaterial = new THREE.MeshPhongMaterial({ color: 0x0066cc });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(-2, 9, 0);
        this.car.add(roof);
        
        // 前挡风玻璃
        const windshieldGeometry = new THREE.BoxGeometry(1, 8, 14);
        const windshieldMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x111111, 
            transparent: true, 
            opacity: 0.7 
        });
        const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
        windshield.position.set(4, 9, 0);
        this.car.add(windshield);
        
        // 车轮
        const wheelGeometry = new THREE.CylinderGeometry(3, 3, 2, 16);
        const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        
        // 前轮
        const frontLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        frontLeftWheel.rotation.z = Math.PI / 2;
        frontLeftWheel.position.set(7, -5, 8);
        this.car.add(frontLeftWheel);
        
        const frontRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        frontRightWheel.rotation.z = Math.PI / 2;
        frontRightWheel.position.set(7, -5, -8);
        this.car.add(frontRightWheel);
        
        // 后轮
        const rearLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        rearLeftWheel.rotation.z = Math.PI / 2;
        rearLeftWheel.position.set(-7, -5, 8);
        this.car.add(rearLeftWheel);
        
        const rearRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        rearRightWheel.rotation.z = Math.PI / 2;
        rearRightWheel.position.set(-7, -5, -8);
        this.car.add(rearRightWheel);
        
        // 车灯
        const headlightGeometry = new THREE.SphereGeometry(1.5, 16, 16);
        const headlightMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffffcc,
            emissive: 0xffffcc,
            emissiveIntensity: 0.5
        });
        
        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(10, 0, 5);
        this.car.add(leftHeadlight);
        
        const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        rightHeadlight.position.set(10, 0, -5);
        this.car.add(rightHeadlight);
        
        // 修改汽车的初始位置，使其在相机视野内
        this.car.position.set(0, 0, 0); // 放在地面上
        this.car.rotation.y = Math.PI;
        this.scene.add(this.car);
        
        // 添加汽车物理属性
        this.speed = 0;
        this.maxSpeed = 5;
        this.acceleration = 0.05;
        this.isGameOver = false;
        
        // 确保相机能看到汽车
        this.camera.position.set(30, 30, 80);
        this.camera.lookAt(this.car.position);
        
        console.log('汽车已创建，位置:', this.car.position);
    }
    
    // 修改updateCameraPosition方法，确保相机始终能看到汽车
    updateCameraPosition() {
        if (!this.car) {
            console.error('汽车对象不存在!');
            return;
        }
        
        // 将相机放置在汽车后上方
        const offset = new THREE.Vector3(30, 30, 80); // 调整相机位置
        this.camera.position.copy(this.car.position).add(offset);
        
        // 让相机看向汽车
        this.camera.lookAt(this.car.position);
        
        console.log('相机位置已更新:', this.camera.position);
    }

    // 添加创建敌机的方法
    // 修改createEnemies方法，降低敌人速度
    createEnemies() {
        for (let i = 0; i < this.totalEnemies; i++) {
            // 创建敌人
            const enemy = new THREE.Group();
            
            // 敌人车身
            const bodyGeometry = new THREE.BoxGeometry(18, 8, 12);
            const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            enemy.add(body);
            
            // 敌人车顶
            const roofGeometry = new THREE.BoxGeometry(10, 6, 10);
            const roofMaterial = new THREE.MeshPhongMaterial({ color: 0xcc0000 });
            const roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.position.set(-2, 7, 0);
            enemy.add(roof);
            
            // 敌人车轮
            const wheelGeometry = new THREE.CylinderGeometry(2.5, 2.5, 2, 16);
            const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
            
            // 四个车轮
            const wheels = [];
            const wheelPositions = [
                [6, -4, 6],  // 前左
                [6, -4, -6], // 前右
                [-6, -4, 6], // 后左
                [-6, -4, -6] // 后右
            ];
            
            for (const pos of wheelPositions) {
                const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(...pos);
                enemy.add(wheel);
                wheels.push(wheel);
            }
            
            // 设置敌人位置 - 分散在玩家汽车前方，距离更远
            enemy.position.set(
                -500 - Math.random() * 1000, // 更远的距离
                0, // 放在地面上
                -200 + Math.random() * 400
            );
            enemy.rotation.y = Math.PI;
            
            // 降低敌人速度
            enemy.speed = 0.2 + Math.random() * 0.3; // 原来是0.5 + Math.random() * 1.5
            enemy.shootInterval = 2000 + Math.random() * 4000; // 增加射击间隔
            enemy.lastShootTime = Date.now();
            
            this.scene.add(enemy);
            this.enemies.push(enemy);
        }
    }

    // 修改handleKeyInput方法，记录按键状态
    handleKeyInput(e) {
        if (this.isGameOver) {
            // 游戏结束后，按R键重新开始
            if (e.key === 'r' || e.key === 'R') {
                this.restartGame();
                return;
            }
            return;
        }
        
        console.log('处理键盘输入:', e.key);
        
        if (!this.car) {
            console.error('汽车对象不存在!');
            return;
        }
        
        // 记录按键状态
        if (!this.keys) {
            this.keys = {};
        }
        this.keys[e.key] = true;
        
        // 立即响应的操作
        switch(e.key) {
            case ' ': // 空格键射击
                this.shoot();
                console.log('射击!');
                break;
            case 'r':
            case 'R': // R键重新开始游戏
                this.restartGame();
                break;
        }
    }

    // 修改animate方法，确保汽车能够移动
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.gameStarted && !this.isGameOver && this.car) {
            // 处理连续按键移动
            if (this.keys) {
                // 移动速度增加，让玩家能更快地移动
                const moveSpeed = 2.5;
                
                if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) {
                    this.car.position.y += moveSpeed; // 上升
                    console.log('汽车上升:', this.car.position.y);
                }
                if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) {
                    this.car.position.y -= moveSpeed; // 下降
                    console.log('汽车下降:', this.car.position.y);
                }
                if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
                    this.car.position.z += moveSpeed; // 左移
                    console.log('汽车左移:', this.car.position.z);
                }
                if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
                    this.car.position.z -= moveSpeed; // 右移
                    console.log('汽车右移:', this.car.position.z);
                }
            }
            
            // 更新相机位置，跟随汽车
            this.updateCameraPosition();
            
            // 更新子弹
            this.updateBullets();
            
            // 更新敌人
            this.updateEnemies();
            
            // 检查碰撞
            this.checkCollisions();
            
            // 更新得分
            this.score += 0.1;
            
            // 更新HUD
            this.updateHUD();
        } else if (this.car) {
            // 游戏未开始时，确保相机看向汽车
            this.camera.lookAt(this.car.position);
        }
        
        // 渲染场景
        this.renderer.render(this.scene, this.camera);
    }

    // 添加射击方法
    shoot() {
        if (!this.car) {
            console.error('汽车对象不存在!');
            return;
        }
        
        const now = Date.now();
        if (now - this.lastShootTime < 300) return; // 限制射击频率
        
        this.lastShootTime = now;
        
        // 创建子弹
        const bulletGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // 设置子弹位置为汽车前方
        bullet.position.copy(this.car.position);
        bullet.position.x -= 15; // 从汽车前方射出
        
        // 设置子弹速度和方向
        bullet.velocity = new THREE.Vector3(-1, 0, 0);
        bullet.velocity.multiplyScalar(10);
        
        this.scene.add(bullet);
        this.bullets.push(bullet);
        
        // 添加射击音效或视觉效果
        console.log("玩家发射子弹!");
    }

    // 修改enemyShoot方法
    enemyShoot(enemy) {
        if (!this.car) {
            console.error('汽车对象不存在!');
            return;
        }
        
        const bulletGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // 设置子弹位置为敌人前方
        bullet.position.copy(enemy.position);
        bullet.position.x += 15; // 从敌人前方射出
        
        // 设置子弹速度和方向 - 朝向玩家
        const direction = new THREE.Vector3();
        direction.subVectors(this.car.position, enemy.position).normalize();
        bullet.velocity = direction.multiplyScalar(5);
        
        this.scene.add(bullet);
        this.enemyBullets.push(bullet);
    }

    // 修改updateBullets方法
    updateBullets() {
        if (!this.car) {
            console.error('汽车对象不存在!');
            return;
        }
        
        // 更新玩家子弹
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.position.add(bullet.velocity);
            
            // 检查子弹是否击中敌人
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                const enemyBox = new THREE.Box3().setFromObject(enemy);
                
                if (enemyBox.containsPoint(bullet.position)) {
                    // 击中敌人
                    this.scene.remove(enemy);
                    this.enemies.splice(j, 1);
                    
                    this.scene.remove(bullet);
                    this.bullets.splice(i, 1);
                    
                    this.enemiesDestroyed++;
                    this.score += 100;
                    
                    // 检查是否击败所有敌人
                    if (this.enemiesDestroyed >= this.totalEnemies) {
                        this.victory();
                    }
                    
                    break;
                }
            }
            
            // 移除超出范围的子弹
            if (bullet.position.distanceTo(this.car.position) > 1000) {
                this.scene.remove(bullet);
                this.bullets.splice(i, 1);
            }
        }
        
        // 更新敌人子弹
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            bullet.position.add(bullet.velocity);
            
            // 检查子弹是否击中玩家
            const playerBox = new THREE.Box3().setFromObject(this.car);
            
            if (playerBox.containsPoint(bullet.position)) {
                // 击中玩家
                this.playerHealth--;
                this.scene.remove(bullet);
                this.enemyBullets.splice(i, 1);
                
                // 检查玩家生命值
                if (this.playerHealth <= 0) {
                    this.gameOver();
                }
                
                continue;
            }
            
            // 移除超出范围的子弹
            if (bullet.position.distanceTo(this.car.position) > 1000) {
                this.scene.remove(bullet);
                this.enemyBullets.splice(i, 1);
            }
        }
    }

    // 修改updateEnemies方法
    updateEnemies() {
        if (!this.car) {
            console.error('汽车对象不存在!');
            return;
        }
        
        const now = Date.now();
        
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            
            // 敌人追踪玩家
            const direction = new THREE.Vector3();
            direction.subVectors(this.car.position, enemy.position).normalize();
            
            enemy.position.x += direction.x * enemy.speed;
            enemy.position.y += direction.y * enemy.speed;
            enemy.position.z += direction.z * enemy.speed;
            
            // 敌人朝向玩家
            enemy.lookAt(this.car.position);
            
            // 敌人射击
            if (now - enemy.lastShootTime > enemy.shootInterval) {
                enemy.lastShootTime = now;
                this.enemyShoot(enemy);
            }
        }
    }

    // 修改checkCollisions方法
    checkCollisions() {
        if (!this.gameStarted || this.isGameOver || !this.car) return;
        
        const carBox = new THREE.Box3().setFromObject(this.car);
        
        // 检查与敌人的碰撞
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const enemyBox = new THREE.Box3().setFromObject(enemy);
            
            if (carBox.intersectsBox(enemyBox)) {
                // 与敌人相撞，直接游戏结束
                this.gameOver();
                return;
            }
        }
    }

    // 修改updateHUD方法
    updateHUD() {
        if (!this.car) {
            console.error('汽车对象不存在!');
            return;
        }
        
        // 更新HUD信息
        document.querySelector('#speed span').textContent = Math.round(this.speed * 20);
        document.querySelector('#altitude span').textContent = Math.round(this.car.position.y);
        
        // 添加生命值和敌人数量显示
        const hudElement = document.getElementById('hud');
        
        if (!document.getElementById('health')) {
            const healthDiv = document.createElement('div');
            healthDiv.id = 'health';
            healthDiv.innerHTML = '生命值: <span>10</span>';
            hudElement.appendChild(healthDiv);
            
            const enemiesDiv = document.createElement('div');
            enemiesDiv.id = 'enemies';
            enemiesDiv.innerHTML = '剩余敌人: <span>10</span>';
            hudElement.appendChild(enemiesDiv);
        }
        
        document.querySelector('#health span').textContent = this.playerHealth;
        document.querySelector('#enemies span').textContent = this.totalEnemies - this.enemiesDestroyed;
    }

    // 修改animate方法
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.gameStarted && !this.isGameOver && this.car) {
            // 根据速度移动汽车
            this.car.position.x -= this.speed;
            
            // 处理连续按键移动
            if (this.keys) {
                if (this.keys['ArrowUp']) {
                    this.car.position.y += 1; // 上升
                }
                if (this.keys['ArrowDown']) {
                    this.car.position.y -= 1; // 下降
                }
                if (this.keys['ArrowLeft']) {
                    this.car.position.z += 1; // 左移
                }
                if (this.keys['ArrowRight']) {
                    this.car.position.z -= 1; // 右移
                }
                if (this.keys['w'] || this.keys['W']) {
                    if (this.speed < this.maxSpeed) {
                        this.speed += this.acceleration * 0.5; // 加速
                    }
                }
                if (this.keys['s'] || this.keys['S']) {
                    if (this.speed > 0) {
                        this.speed -= this.acceleration * 0.5; // 减速
                    }
                }
            }
            
            // 更新相机位置，跟随汽车
            this.updateCameraPosition();
            
            // 更新子弹
            this.updateBullets();
            
            // 更新敌人
            this.updateEnemies();
            
            // 检查碰撞
            this.checkCollisions();
            
            // 更新得分
            this.score += this.speed * 0.1;
            
            // 更新HUD
            this.updateHUD();
        } else if (this.car) {
            // 游戏未开始时，确保相机看向汽车
            this.camera.lookAt(this.car.position);
        }
        
        // 渲染场景
        this.renderer.render(this.scene, this.camera);
    }

    // 添加胜利方法
    victory() {
        this.isGameOver = true;
        this.speed = 0;
        alert('恭喜你赢了！你的得分: ' + Math.round(this.score) + '\n按R键重新开始游戏');
    }

    // 游戏结束方法
    gameOver() {
        this.isGameOver = true;
        this.speed = 0;
        alert('游戏结束！你的得分: ' + Math.round(this.score) + '\n按R键重新开始游戏');
    }
}

// 创建游戏实例
const game = new Game();

// 处理窗口大小变化
window.addEventListener('resize', () => {
    game.camera.aspect = window.innerWidth / window.innerHeight;
    game.camera.updateProjectionMatrix();
    game.renderer.setSize(window.innerWidth, window.innerHeight);
});