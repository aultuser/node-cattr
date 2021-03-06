/**
 * Token entity
 * @typedef  {Object} TokenEntity
 * @property {String} token       Access token
 * @property {String} tokenType   Access token type
 * @property {Date}   tokenExpire Access token expiration date
 */

/**
 * Role entity
 * @typedef  {Object} RoleEntity
 * @property {Number}    id        ID
 * @property {String}    name      Role name
 * @property {Date}      createdAt Date of creation
 * @property {Date}      updatedAt Last update timestamp
 * @property {Date|null} deletedAt Date of removal
 */

/**
 * Data object representing project-specific role
 * @typedef  {Object} ProjectRole
 * @property {Number}     projectId ID
 * @property {RoleEntity} role      Assigned role entity
 * @property {Date}       createdAt Date of creation
 * @property {Date}       updatedAt Last update timestamp
 * @property {Date|null}  deletedAt Date of removal
 */

/**
 * User entity
 * @typedef  {Object} UserEntity
 * @property {Number} id ID
 * @property {String} fullName Full name
 * @property {String} email Email
 * @property {String|null} avatar Profile picture URL
 * @property {Boolean} screenshotsEnabled Is screenshot capture enabled?
 * @property {Boolean} manualTimeEnabled Is manual time available?
 * @property {Number} inactivityTimeout Inactivity detection period in seconds
 * @property {Number} screenshotsInterval Maximum interval between screenshot capture
 * @property {Boolean} isActive Is this user active?
 * @property {Boolean} isAdmin  Is this user have administration privileges?
 * @property {Boolean} important Is this user marked as important?
 * @property {Boolean} forcePasswordReset Is this user enforced to change their password?
 * @property {String} timezone User's timezone (like 'Europe/Moscow')
 * @property {RoleEntity} role Default role
 * @property {Array<ProjectRole>} projectsRoles Project-specific roles
 * @property {Date} createdAt Date of creation
 * @property {Date} updatedAt Last update timestamp
 * @property {Date|null} deletedAt Date of removal
 */

/**
 * Authentication data response
 * @typedef  {Object} UserLoginDTO
 * @property {TokenEntity} token Access token
 * @property {UserEntity}  user  User properties
 */

/**
 * Authentication operations
 */
module.exports = $ => {

  const ops = {};

  /**
   * Format UserEntity
   * @param {Object} user Raw object representing user
   * @returns {UserEntity}
   */
  const userFormatter = user => {

    const formattedOut = {

      id: Number(user.id),
      fullName: String(user.full_name),
      email: String(user.email),
      avatar: user.avatar ? String(user.avatar) : null,
      manualTimeEnabled: Boolean(user.manual_time),
      inactivityTimeout: Number(user.computer_time_popup),
      screenshotsEnabled: Boolean(user.screenshots_active),
      screenshotsInterval: Number(user.screenshots_interval),
      isActive: Boolean(user.active),
      isAdmin: Boolean(user.is_admin),
      isImportant: Boolean(user.important),
      forcePasswordReset: Boolean(user.change_password),
      timezone: String(user.timezone),
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at),
      deletedAt: user.deleted_at ? new Date(user.deleted_at) : null,
      role: {
        id: Number(user.role.id),
        name: String(user.role.name),
        createdAt: new Date(user.role.created_at),
        updatedAt: new Date(user.role.updated_at),
        deletedAt: user.role.deleted_at ? new Date(user.role.deleted_at) : null,
      }
    };

    formattedOut.projectsRole = user.projects_relation.map(pr => ({
      projectId: String(pr.project_id),
      createdAt: new Date(pr.created_at),
      updatedAt: new Date(pr.updated_at),
      deletedAt: pr.deleted_at ? new Date(pr.deleted_at) : null,
      role: {
        id: Number(pr.role.id),
        name: String(pr.role.name),
        createdAt: new Date(pr.role.created_at),
        updatedAt: new Date(pr.role.updated_at),
        deletedAt: pr.role.deleted_at ? new Date(pr.role.deleted_at) : null,
      }
    }));

    return formattedOut;

  };

  /**
   * Perform login
   * @async
   * @param {String} email Email
   * @param {String} password Password
   * @returns {Promise<UserLoginDTO>} User's properties with token data if succeed
   */
  ops.login = async (email, password) => {

    if (typeof email !== 'string' || email.length === 0)
      throw new TypeError('Incorrect email parameter given');

    if (typeof password !== 'string' || password.length === 0)
      throw new TypeError('Incorrect password parameter given');

    const res = await $.post('api/auth/login', { email, password }, { noAuth: true });
    if (!res.success) {

      if (res.isNetworkError)
        throw new $.NetworkError(res);

      if (res.error && res.error instanceof $.ApiError)
        throw res.error;

      throw new $.ApiError(
        res.error.response.status,
        res.error.response.data.error_type || 'unknown',
        res.error.response.data.message || 'Unknown message',
      );

    }

    // Double-check that response is successfull
    if (res.response.data.success !== true)
      throw new $.ApiError(0, 'unexpected_structure', 'Incorrect response structure');

    return {
      token: {
        token: res.response.data.access_token,
        tokenType: res.response.data.token_type,
        tokenExpire: new Date(res.response.data.expires_in),
      },
      user: userFormatter(res.response.data.user)
    };

  };

  /**
   * Get user properties
   * @async
   * @returns {Promise<Object>} User's properties
   */
  ops.me = async () => {

    const res = await $.get('api/auth/me', {});
    if (!res.success) {

      if (res.isNetworkError)
        throw new $.NetworkError(res);

      if (res.error && res.error instanceof $.ApiError)
        throw res.error;

      throw new $.ApiError(
        res.error.response.status,
        res.error.response.data.error_type || 'unknown',
        res.error.response.data.message || 'Unknown message',
      );

    }

    if (!res.response.data.success || typeof res.response.data.user !== 'object')
      throw new $.ApiError(0, 'unexpected_structure', 'Incorrect response structure');

    return userFormatter(res.response.data.user);

  };

  /**
   * Logout
   * @async
   * @param {Boolean} [fromAll=false] Logout from all
   * @returns {Promise<Boolean>} Returns true if succeed
   */
  ops.logout = async (fromAll = false) => {

    const endpoint = (fromAll === true) ? 'api/auth/logout-from-all' : 'api/auth/logout';
    const req = await $.post(endpoint, {}, { noRelogin: true });
    if (!req.success) {

      if (req.isNetworkError)
        throw new $.NetworkError(req);

      if (req.error && req.error instanceof $.ApiError)
        throw req.error;

      throw new $.ApiError(
        req.error.response.status,
        req.error.response.data.error_type || 'unknown',
        req.error.response.data.message || 'Unknown message',
      );

    }

    return true;

  };

  /**
   * Refresh token
   * @async
   * @param {Boolean} [relogin=false] Should we try to relogin on failure
   * @returns {Promise<TokenDTO>} New token
   */
  ops.refresh = async (relogin = false) => {

    const req = await $.post('api/auth/refresh', {}, { noRelogin: !relogin });
    if (!req.success) {

      if (req.isNetworkError)
        throw new $.NetworkError(req);

      if (req.error && req.error instanceof $.ApiError)
        throw req.error;

      throw new $.ApiError(
        req.error.response.status,
        req.error.response.data.error_type || 'unknown',
        req.error.response.data.message || 'Unknown message',
      );

    }

    if (
      !req.response.data.success ||
      typeof req.response.data.access_token !== 'string' ||
      typeof req.response.data.token_type !== 'string' ||
      typeof req.response.data.expires_in !== 'string'
    )
      throw new $.ApiError(0, 'unexpected_structure', 'Incorrect response structure');

    return {
      token: req.response.data.access_token,
      tokenType: req.response.data.token_type,
      tokenExpire: new Date(req.response.data.expires_in),
    };

  };

  return ops;

};
