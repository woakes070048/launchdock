/**
 * The global namespace for Settings.
 * @namespace Settings
 */
Settings = new Mongo.Collection("settings");

Settings.schema = new SimpleSchema({

  siteTitle: {
    type: String,
    optional: true,
    label: 'Site Title'
  },

  tutumUsername: {
    type: String,
    optional: true,
    label: 'Tutum Username',
    autoform: {
      private: true
    }
  },

  tutumToken: {
    type: String,
    optional: true,
    label: 'Tutum API Token',
    autoform: {
      private: true
    }
  },

  rancherApiKey: {
    type: String,
    optional: true,
    label: 'Rancher API Key',
    autoform: {
      private: true
    }
  },

  awsKey: {
    type: String,
    optional: true,
    label: 'AWS Key',
    autoform: {
      private: true
    }
  },

  awsSecret: {
    type: String,
    optional: true,
    label: 'AWS Secret',
    autoform: {
      private: true
    }
  },

  awsRegion: {
    type: String,
    optional: true,
    label: 'AWS Region',
    autoform: {
      private: true
    }
  },

  createdAt: {
    type: Date,
    label: 'Created',
    autoValue: function() {
      if (this.isInsert) {
        return new Date();
      } else if (this.isUpsert) {
        return {
          $setOnInsert: new Date()
        };
      } else {
        this.unset();
      }
    },
    denyUpdate: true
  },

  updatedAt: {
    type: Date,
    label: 'Updated',
    autoValue: function() {
      if (this.isUpdate) {
        return new Date();
      }
    },
    denyInsert: true,
    optional: true
  }
});

Settings.attachSchema(Settings.schema);