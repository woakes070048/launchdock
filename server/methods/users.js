import _ from 'lodash';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';
import { Roles } from 'meteor/alanning:roles';
import { SSR } from 'meteor/meteorhacks:ssr';
import { Invitations, Users } from '/lib/collections';
import { Logger } from '/server/api';

export default function () {

  Meteor.methods({

    'changeUserEmail'(options) {

      const logger = Logger.child({
        meteor_method: 'changeUserEmail',
        meteor_method_args: options,
        userId: this.userId
      });

      check(options, {
        userId: String,
        email: String
      });

      const isAdmin = Roles.userIsInRole(this.userId, 'superuser');

      if (options.userId !== this.userId && !isAdmin) {
        const err = 'AUTH ERROR: Action not allowed';
        logger.error(err);
        throw new Meteor.Error('action-not-allowed', err);
      }

      const id = options.userId || this.userId;

      const user = Users.findOne(id);

      if (!user) {
        const err = 'User not found';
        logger.error(err);
        throw new Meteor.Error(err);
      }

      const oldEmail = user.emails[0].address;

      if (options.email.toLowerCase() === oldEmail.toLowerCase()) {
        logger.info('Same email. Not updating.');
        return true;
      }

      Accounts.addEmail(id, options.email);

      Accounts.removeEmail(id, oldEmail);

      logger.info(`Email succesfully updated to ${options.email} for user ${id}`);

      return true;
    },

    /**
     * Add roles to users. Does NOT overwrite
     * the user's existing roles.
     */
    'addUsersToRoles'(options) {

      if (!Roles.userIsInRole(this.userId, 'admin')) {
        const err = 'AUTH ERROR: Invalid credentials';
        Logger.error(err);
        throw new Meteor.Error(err);
      }

      check(options, {
        users: Match.OneOf(String, [String]),
        roles: Match.OneOf(String, [String])
      });

      try {
        Roles.addUsersToRoles(options.users, options.roles);
      } catch (err) {
        Logger.error(err);
        throw new Meteor.Error(err);
      }

      if(Array.isArray(options.users)) {
        _.each(options.users, (user) => {
          Logger.info(`Added user ${user} to role(s) ${options.roles}`);
        });
      } else {
        Logger.info(`Added user ${options.users} to role(s) ${options.roles}`);
      }

      return true;
    },


    /**
     * Set roles for users. This DOES overwrite
     * any of the user's existing roles.
     */
    'setUserRoles'(options) {

      if (!Roles.userIsInRole(this.userId, 'admin')) {
        const err = 'AUTH ERROR: Invalid credentials';
        Logger.error(err);
        throw new Meteor.Error(err);
      }

      check(options, {
        users: Match.OneOf(String, [String]),
        roles: Match.OneOf(String, [String])
      });

      try {
        Roles.setUserRoles(options.users, options.roles);
      } catch (err) {
        Logger.error(err);
        throw new Meteor.Error(err);
      }

      if(Array.isArray(options.users)) {
        _.each(options.users, (user) => {
          Logger.info(`Set user ${user} to role(s) ${options.roles}`);
        });
      } else {
        Logger.info(`Set user ${options.users} to role(s) ${options.roles}`);
      }

      return true;
    },


    sendUserInvite(options) {

      if (!Roles.userIsInRole(this.userId, 'admin')) {
        const err = 'AUTH ERROR: Invalid credentials';
        Logger.error(err);
        throw new Meteor.Error(err);
      }

      check(options, {
        email: String,
        role: String
      });

      this.unblock();

      if (!!Invitations.findOne({ email: options.email })) {
        const err = 'Email has already been invited';
        Logger.error(err);
        throw new Meteor.Error(err);
      }

      options.token = Random.hexString(32);
      options.invitedBy = this.userId;

      Invitations.insert(options);

      let url = Meteor.absoluteUrl() + 'invite/' + options.token;
      let emailHtml = 'email/templates/admin-invitation.html';

      SSR.compileTemplate('user-invite', Assets.getText(emailHtml));
      let content = SSR.render('user-invite', { url: url });

      let emailOpts = {
        to: options.email,
        from: 'Launchdock <invites@launchdock.io>',
        subject: 'You\'re invited to Launchdock!',
        html: content
      };

      Meteor.defer(() => {
        Email.send(emailOpts);
      });

      return true;
    },


    activateUserInvite(options) {

      check(options, {
        email: String,
        password: String,
        inviteToken: String
      });

      let invite = Invitations.findOne({ token: options.inviteToken });

      if (!invite) {
        const err = 'Invitation not found.';
        Logger.error(err);
        throw new Meteor.Error(err);
      }

      // invite can only be used once
      if (invite.accepted) {
        const err = 'Invitation has already been used.';
        Logger.error(err);
        throw new Meteor.Error(err);
      }

      let userId = Accounts.createUser({
        email: invite.email, // more secure than method arg
        password: options.password
      });

      Roles.setUserRoles(userId, [invite.role]);

      Logger.info(`New user created with email ${options.email} and role ${invite.role}`);

      Invitations.update({ _id: invite._id }, {
        $set: {
          accepted: true,
          acceptedDate: new Date(),
          userId: userId
        }
      }, (err, res) => {
        if (!err) {
          Logger.info(`Invitation successfully accepted by ${invite.email}`);
        }
      });

      return true;
    },


    revokeInvitation(inviteId) {

      if (!Roles.userIsInRole(this.userId, 'admin')) {
        const err = 'AUTH ERROR: Invalid credentials';
        Logger.error(err);
        throw new Meteor.Error(err);
      }

      check(inviteId, String);

      try {
        Invitations.remove(inviteId);
      } catch (err) {
        Logger.error(err);
        throw new Meteor.Error(err);
      }

      Logger.info(`Successfully removed invitation: ${inviteId}`);

      return true;
    },


    deleteInvitedUser(userId) {

      if (!Roles.userIsInRole(this.userId, 'admin')) {
        const err = 'AUTH ERROR: Invalid credentials';
        Logger.error(err);
        throw new Meteor.Error(err);
      }

      check(userId, String);

      this.unblock();

      Invitations.remove({ userId: userId });
      Users.remove(userId);

      Logger.info(`User ${userId} succesfully deleted.`);

      return true;
    }

  });

}
