from django.conf.urls import patterns, url

from billbuddy import views

urlpatterns = patterns('',
    # ex: /polls/
    url(r'^$', views.index, name='index'),
    url(r'^check_in/$', views.check_in, name='check_in'),
    url(r'^join_group/$', views.join_group, name='join_group'),
    url(r'^order/(?P<restaurant_id>\d+)/$', views.order, name='order'),

)