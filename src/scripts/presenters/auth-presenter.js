import AuthView from '../views/auth-view.js';

class AuthPresenter {
    constructor({ viewContainer, authModel }) {
        this._viewContainer = viewContainer;
        this._authModel = authModel;
        this._view = new AuthView();
    }

    showLogin() {
        this._viewContainer.innerHTML = this._view.getLoginTemplate();
        
        this._view.setLoginHandler(async (email, password) => {
            try {
                await this._authModel.login(email, password);
                this._view.showSuccess('Login successful!');
                setTimeout(() => {
                    window.location.hash = '#/home';
                }, 1500);
            } catch (error) {
                this._view.showError(error.message);
            }
        });
    }

    showRegister() {
        this._viewContainer.innerHTML = this._view.getRegisterTemplate();
        
        this._view.setRegisterHandler(async (name, email, password) => {
            try {
                await this._authModel.register(name, email, password);
                this._view.showSuccess('Registration successful! Please login.');
                setTimeout(() => {
                    window.location.hash = '#/login';
                }, 1500);
            } catch (error) {
                this._view.showError(error.message);
            }
        });
    }
}

export default AuthPresenter;