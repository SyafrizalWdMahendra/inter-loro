class AuthView {
    getLoginTemplate() {
        return `
            <section class="auth-section">
                <h2>Login</h2>
                <form id="login-form" class="auth-form">
                    <div class="form-group">
                        <label for="login-email">Email</label>
                        <input type="email" id="login-email" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="login-password">Password</label>
                        <input type="password" id="login-password" required>
                    </div>
                    
                    <button type="submit" class="btn">Login</button>
                    <p>Don't have an account? <a href="#/register">Register</a></p>
                </form>
            </section>
            
            <div id="notification" class="notification hidden"></div>
        `;
    }

    getRegisterTemplate() {
        return `
            <section class="auth-section">
                <h2>Register</h2>
                <form id="register-form" class="auth-form">
                    <div class="form-group">
                        <label for="register-name">Name</label>
                        <input type="text" id="register-name" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="register-email">Email</label>
                        <input type="email" id="register-email" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="register-password">Password</label>
                        <input type="password" id="register-password" required minlength="6">
                    </div>
                    
                    <button type="submit" class="btn">Register</button>
                    <p>Already have an account? <a href="#/login">Login</a></p>
                </form>
            </section>
            
            <div id="notification" class="notification hidden"></div>
        `;
    }

    setLoginHandler(handler) {
        const form = document.getElementById('login-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            try {
                await handler(email, password);
            } catch (error) {
                this.showError(error.message);
            }
        });
    }

    setRegisterHandler(handler) {
        const form = document.getElementById('register-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            
            try {
                await handler(name, email, password);
            } catch (error) {
                this.showError(error.message);
            }
        });
    }

    showSuccess(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.remove('error');
        notification.classList.remove('hidden');
        notification.classList.add('success');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }

    showError(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.remove('success');
        notification.classList.remove('hidden');
        notification.classList.add('error');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
}

export default AuthView;